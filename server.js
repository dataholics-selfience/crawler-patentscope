// server.js
import express from "express";
import cors from "cors";
import { puppeteerCrawler } from "./crawlers/puppeteerCrawler.js";
import { playwrightCrawler } from "./crawlers/playwrightCrawler.js";
import { seleniumCrawler } from "./crawlers/seleniumCrawler.js";
import { validatePatentHTML } from "./utils/htmlValidator.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine) return res.status(400).json({ error: "Query param 'medicine' missing" });

  const crawlers = [puppeteerCrawler, playwrightCrawler, seleniumCrawler];
  let html = null;
  let source = null;

  for (const crawler of crawlers) {
    try {
      html = await crawler(medicine);
      if (validatePatentHTML(html)) {
        source = crawler.name;
        break; // HTML válido, parar a sequência
      }
    } catch (err) {
      console.warn(`Crawler ${crawler.name} falhou: ${err.message}`);
    }
  }

  if (!html) {
    return res.status(500).json({ error: "Falha ao buscar dados da WIPO" });
  }

  // Parse HTML e extrair patentes (usando Cheerio, Groq, ou regex leve)
  let results = [];
  try {
    // parse simples como exemplo
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    $(".result-title a").each((i, el) => {
      results.push({ title: $(el).text(), link: $(el).attr("href") });
    });
  } catch (parseErr) {
    console.warn("Erro no parse HTML:", parseErr.message);
  }

  res.json({
    query: medicine,
    total_results: results.length,
    results,
    source,
  });
});

app.listen(PORT, () => console.log(`🚀 WIPO Parser robusto rodando na porta ${PORT}`));
