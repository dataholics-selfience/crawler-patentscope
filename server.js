import express from "express";
import cors from "cors";
import { puppeteerCrawler } from "./src/crawlers/puppeteerCrawler.js";
import { playwrightCrawler } from "./src/crawlers/playwrightCrawler.js";
import { seleniumCrawler } from "./src/crawlers/seleniumCrawler.js";

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
      if (html) { // stub sempre retorna algo
        source = crawler.name;
        break;
      }
    } catch (err) {
      console.warn(`Crawler ${crawler.name} falhou: ${err.message}`);
    }
  }

  res.json({
    query: medicine,
    total_results: 1,
    results: [{ title: "Stub Patent", link: "https://example.com/stub" }],
    source,
  });
});

// Importar rota Groq
import groqRoutes from "./src/routes/groqRoutes.js";
app.use("/api/groq", groqRoutes);

app.listen(PORT, () => console.log(`🚀 Patent Scope stub rodando na porta ${PORT}`));


