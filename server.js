import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

const app = express();
const PORT = process.env.PORT || 8080;
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(helmet());
app.use(morgan("tiny"));
app.use(compression());

app.get("/health", (req, res) => res.send("OK"));

// --- Utilitário: fallback com Groq ---
async function fallbackGroq(html, query) {
  try {
    const prompt = `
Você é um analisador de HTML especializado em resultados de patentes da WIPO.
Recebe abaixo o conteúdo HTML de uma página de resultados e deve retornar um JSON estruturado com os seguintes campos:
[
  {
    "patent_number": "WO2023000001A1",
    "title": "Title of the invention",
    "applicant": "PharmaCorp Ltd.",
    "publication_date": "2023-01-01",
    "link": "https://patentscope.wipo.int/...etc"
  }
]

HTML da página:
${html.slice(0, 10000)}
    `;
    const response = await groqClient.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: "Você é um parser de resultados de patente." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "";
    const json = JSON.parse(content.match(/\[.*\]/s)?.[0] || "[]");

    return {
      query,
      source: "groq-fallback",
      total_results: json.length,
      results: json
    };
  } catch (err) {
    console.error("⚠️ Erro no fallback Groq:", err);
    return { query, error: "Falha no fallback Groq", results: [] };
  }
}

// --- Endpoint principal ---
app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine) return res.status(400).json({ error: "Parâmetro 'medicine' é obrigatório" });

  console.log(`🔍 Buscando patentes WIPO para: ${medicine}`);

  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForTimeout(6000);

    const html = await page.content();
    const $ = cheerio.load(html);
    const results = [];

    $("tr[class*='resultRow']").each((i, el) => {
      const number = $(el).find("td:nth-child(1)").text().trim();
      const title = $(el).find("td:nth-child(2)").text().trim();
      const applicant = $(el).find("td:nth-child(3)").text().trim();
      const link = $(el).find("a").attr("href");
      const publicationDate = $(el).find("td:nth-child(4)").text().trim();

      if (number && title) {
        results.push({
          patent_number: number,
          title,
          applicant,
          publication_date: publicationDate || null,
          link: link ? `https://patentscope.wipo.int${link}` : null
        });
      }
    });

    await browser.close();

    if (results.length === 0) {
      console.warn("⚠️ Nenhum resultado estruturado encontrado, ativando fallback Groq...");
      const groqData = await fallbackGroq(html, medicine);
      return res.json(groqData);
    }

    res.json({
      query: medicine,
      source: "cheerio",
      total_results: results.length,
      results
    });
  } catch (err) {
    console.error("❌ Erro geral:", err);
    res.status(500).json({ error: "Falha ao buscar dados da WIPO" });
  }
});

app.listen(PORT, () => console.log(`🚀 WIPO Parser robusto rodando na porta ${PORT}`));
