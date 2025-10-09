// server.js
import express from "express";
import cors from "cors";
// imports condicionais / stubs temporários
let puppeteerCrawler;
let playwrightCrawler;
let seleniumCrawler;

try {
  puppeteerCrawler = (await import("./crawlers/puppeteerCrawler.js")).puppeteerCrawler;
} catch {
  puppeteerCrawler = async (medicine) => {
    console.log("Stub puppeteerCrawler chamado (temporário) para:", medicine);
    return "<html></html>";
  };
}

try {
  playwrightCrawler = (await import("./crawlers/playwrightCrawler.js")).playwrightCrawler;
} catch {
  playwrightCrawler = async (medicine) => {
    console.log("Stub playwrightCrawler chamado (temporário) para:", medicine);
    return "<html></html>";
  };
}

try {
  seleniumCrawler = (await import("./crawlers/seleniumCrawler.js")).seleniumCrawler;
} catch {
  seleniumCrawler = async (medicine) => {
    console.log("Stub seleniumCrawler chamado (temporário) para:", medicine);
    return "<html></html>";
  };
}

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

  let results = [];
  try {
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
