// src/server.js
import express from "express";
import cors from "cors";

// Import dos crawlers (mesmo que ainda sejam stubs)
import * as puppeteerCrawler from "./crawlers/puppeteerCrawler.js";
import * as playwrightCrawler from "./crawlers/playwrightCrawler.js";
import * as seleniumCrawler from "./crawlers/seleniumCrawler.js";
import * as validatorCrawler from "./crawlers/validatorCrawler.js";

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck rápido para Railway
app.get("/health", (req, res) => res.status(200).send("OK"));

// Endpoint de teste para ver se os crawlers importaram
app.get("/test", (req, res) => {
  res.json({
    puppeteer: !!puppeteerCrawler.crawlWithPuppeteer,
    playwright: !!playwrightCrawler.crawlWithPlaywright,
    selenium: !!seleniumCrawler.crawlWithSelenium,
    validator: !!validatorCrawler.crawlWithValidator
  });
});

// Porta do Railway ou fallback para 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
