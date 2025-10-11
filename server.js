import express from "express";
import cors from "cors";

// Import apenas as funções, sem instanciar browser
import { runCrawlersSequence } from "./src/core/orchestrator.js";

const app = express();
app.use(cors());
app.use(express.json());

// Healthcheck rápido
app.get("/health", (req, res) => {
  res.status(200).send({ status: "ok" });
});

// Endpoint para iniciar toda a sequência de crawlers
app.post("/start-crawlers", async (req, res) => {
  try {
    const result = await runCrawlersSequence();
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Erro ao executar crawlers:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
