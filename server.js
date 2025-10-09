import express from "express";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/health", (_, res) => res.status(200).send("ok"));

app.get("/api/data/patentscope/patents", async (req, res) => {
  const query = req.query.medicine;
  if (!query) return res.status(400).json({ error: "Parâmetro 'medicine' é obrigatório" });

  console.log(`🔍 Buscando patentes WIPO para: ${query}`);
  const url = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(query)}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    console.log(`🌐 Navegando até: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // 🕒 Esperar seletor confiável da WIPO (primeiro título de patente)
    await page.waitForSelector(".result-title a", { timeout: 30000 });
    console.log("✅ Página renderizada completamente.");

    const html = await page.content();
    const $ = cheerio.load(html);

    const results = [];
    $(".result").each((_, el) => {
      const title = $(el).find(".result-title a").text().trim();
      const link = "https://patentscope.wipo.int" + $(el).find(".result-title a").attr("href");
      const applicant = $(el).find(".applicants").text().trim();
      const date = $(el).find(".date").text().trim();
      if (title) {
        results.push({ title, applicant, date, link });
      }
    });

    console.log(`✅ Capturadas ${results.length} patentes para: ${query}`);
    res.json({ query, total_results: results.length, results });
  } catch (err) {
    console.error("❌ Erro geral:", err);
    res.status(500).json({ error: "Falha ao buscar dados da WIPO", details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 WIPO Parser renderizador rodando na porta ${PORT}`);
});
