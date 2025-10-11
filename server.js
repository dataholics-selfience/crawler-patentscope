// src/server.js
import express from "express";
import cors from "cors";

// Apenas import dos crawlers (não executa nada aqui)
import * as puppeteerCrawler from "./crawlers/puppeteerCrawler.js";
import * as playwrightCrawler from "./crawlers/playwrightCrawler.js";
import * as seleniumCrawler from "./crawlers/seleniumCrawler.js";
import * as validatorCrawler from "./crawlers/validatorCrawler.js";
import * as retryLoop from "./core/groqRetryLoop.js";

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck rápido para Railway
app.get("/health", (req, res) => res.status(200).send("OK"));

// Endpoint para disparar crawlers sequenciais manualmente
app.post("/start-crawlers", async (req, res) => {
  try {
    // Aqui você pode chamar seu orchestrator/loops sem travar a inicialização
    await retryLoop.runAllCrawlers();
    res.json({ status: "Crawlers started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Porta do Railway ou fallback para 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
