// server.js
import express from "express";
import cors from "cors";

// Import dos crawlers e orchestrator
// Certifique-se que todos os arquivos exportam funções corretamente
import { crawlWithPuppeteer } from "./crawlers/puppeteerCrawler.js";
import { crawlWithPlaywright } from "./crawlers/playwrightCrawler.js";
import { crawlWithSelenium } from "./crawlers/seleniumCrawler.js";
import { validateData } from "./validators/validator.js";
import { retryLoop } from "./core/retryLoop.js";
import { orchestrator } from "./core/orchestrator.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Healthcheck rápido
app.get("/health", (req, res) => res.status(200).send("OK"));

// Endpoint para disparar os crawlers em sequência
app.post("/start-crawlers", async (req, res) => {
  try {
    console.log("Starting crawler sequence...");

    // Puppeteer
    console.log("Running Puppeteer crawler...");
    await crawlWithPuppeteer();

    // Playwright
    console.log("Running Playwright crawler...");
    await crawlWithPlaywright();

    // Selenium
    console.log("Running Selenium crawler...");
    await crawlWithSelenium();

    // Validator
    console.log("Validating data...");
    await validateData();

    // Retry Loop
    console.log("Running retry loop...");
    await retryLoop.runAll();

    // Orchestrator final
    console.log("Running orchestrator...");
    await orchestrator();

    console.log("Crawler sequence completed.");
    res.json({ status: "success", message: "All crawlers executed" });
  } catch (err) {
    console.error("Error during crawler sequence:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Start do servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
