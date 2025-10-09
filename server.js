// server.js
import express from "express";
import cors from "cors";
import { validatePatentHTML } from "./utils/htmlValidator.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ---- STUBS temporários ----
const puppeteerCrawler = async (medicine) => {
  console.log("Stub puppeteerCrawler chamado para:", medicine);
  return "<html></html>";
};
const playwrightCrawler = async (medicine) => {
  console.log("Stub playwrightCrawler chamado para:", medicine);
  return "<html></html>";
};
const seleniumCrawler = async (medicine) => {
  console.log("Stub seleniumCrawler chamado para:", medicine);
  return "<html></html>";
};

// ---- Rotas ----
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
        source = crawler.name || "stub";
        break;
      }
    } catch (err) {
      console.warn(`Crawler ${crawler.name || "stub"} falhou: ${err.message}`);
    }
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

app.listen(PORT, () => console.log(`🚀 WIPO Parser rodando na porta ${PORT}`));
