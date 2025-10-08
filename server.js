// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import puppeteer from "puppeteer";
import cheerio from "cheerio";
import { groq } from "groq-sdk";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(helmet());
app.use(morgan("combined"));

app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine) return res.status(400).json({ error: "Parametro 'medicine' é obrigatório" });

  console.log(`🔍 Buscando patentes para: ${medicine}`);

  let browser;
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;
    await page.goto(url, { waitUntil: "networkidle2" });

    // Espera a tabela de resultados aparecer
    await page.waitForSelector(".resultTable", { timeout: 15000 }).catch(() => null);

    const html = await page.content();
    const $ = cheerio.load(html);

    // Extrair resultados da tabela
    const results = [];
    $(".resultTable tr").each((i, el) => {
      if (i === 0) return; // pular header
      const tds = $(el).find("td");
      results.push({
        title: $(tds[0]).text().trim(),
        publication_number: $(tds[1]).text().trim(),
        publication_date: $(tds[2]).text().trim(),
        applicants: $(tds[3]).text().trim(),
        inventors: $(tds[4]).text().trim(),
        link: $(tds[0]).find("a").attr("href") || null
      });
    });

    let response;
    if (results.length > 0) {
      response = { query: medicine, total_results: results.length, results };
    } else {
      // fallback Groq caso a tabela não exista ou seletores mudem
      const fallbackResults = groq("*[_type == 'tr']", html);
      response = { query: medicine, total_results: fallbackResults.length, results: fallbackResults };
      console.warn("⚠️ Nenhum resultado estruturado encontrado, fallback Groq...");
    }

    res.json(response);
  } catch (err) {
    console.error("❌ Erro no parser:", err);
    res.status(500).json({ error: "Erro ao buscar patentes", details: err.message });
  } finally {
    if (browser) await browser.close();
    console.log("🧹 Browser fechado.");
  }
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log(`🚀 WIPO Parser rodando na porta ${PORT}`);
});
