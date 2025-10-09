import express from "express";
import puppeteer from "puppeteer";
import Groq from "groq-sdk";

const app = express();
const PORT = process.env.PORT || 8080;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "sk-xxxx", // coloque sua key real no Railway
});

// Função robusta para buscar e renderizar HTML
async function fetchRenderedHTML(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); // 60s
    console.log(`🌐 Renderizando página com Puppeteer: ${url}`);

    // Vai até a página e espera o conteúdo principal carregar
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("body", { timeout: 15000 });

    // Aguarda estabilidade de renderização
    await new Promise((r) => setTimeout(r, 3000));

    const html = await page.content();
    return html;
  } catch (err) {
    console.error("⚠️ Erro no Puppeteer:", err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

// Função de fallback Groq — usa IA para tentar extrair estrutura de dados
async function fallbackGroqParse(html, query) {
  try {
    console.log("⚠️ Nenhum resultado direto — tentando fallback Groq...");

    const prompt = `
Extraia e retorne em JSON estruturado as patentes mencionadas no texto HTML a seguir
relacionadas à substância ou medicamento "${query}". 
Retorne no formato:
[
  { "title": "", "publication_number": "", "applicant": "", "date": "", "link": "" }
]
HTML:
${html.slice(0, 8000)}
`;

    const response = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const text = response.choices?.[0]?.message?.content?.trim() || "";
    return { source: "groq", data: [{ parsed_text: text }] };
  } catch (err) {
    console.error("⚠️ Erro no fallback Groq:", err.message);
    return { source: "groq", data: [] };
  }
}

// Rota principal da API
app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine || "";
  if (!medicine) {
    return res.status(400).json({ error: "Parâmetro 'medicine' é obrigatório." });
  }

  const searchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(
    medicine
  )}`;

  try {
    console.log(`🔍 Buscando patentes WIPO para: ${medicine}`);

    const html = await fetchRenderedHTML(searchUrl);

    if (!html || html.length < 5000) {
      console.log("⚠️ HTML vazio ou incompleto. Usando fallback Groq.");
      const parsed = await fallbackGroqParse(html || "", medicine);
      return res.json(parsed);
    }

    // Extrai títulos e links básicos com regex (estrutura simples)
    const results = [...html.matchAll(/<a[^>]+class="result_title"[^>]*>(.*?)<\/a>/g)].map(
      (m) => m[1].replace(/<[^>]+>/g, "").trim()
    );

    const total = results.length;
    console.log(`✅ Capturadas ${total} possíveis patentes para: ${medicine}`);

    if (total === 0) {
      const parsed = await fallbackGroqParse(html, medicine);
      return res.json(parsed);
    }

    res.json({
      query: medicine,
      total_results: total,
      results: results.map((r, i) => ({ id: i + 1, title: r })),
    });
  } catch (error) {
    console.error("❌ Erro geral:", error);
    res.status(500).json({ error: "Falha ao buscar dados da WIPO" });
  }
});

// Endpoint de healthcheck (Railway precisa disso)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`🚀 WIPO Parser robusto rodando na porta ${PORT}`);
});
