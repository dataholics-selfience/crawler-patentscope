// src/routes/groqRoutes.js
import express from "express";
import { runGroqPipeline } from "../core/groqOrchestrator.js";

const router = express.Router();

/**
 * Endpoint: /api/groq/pipeline?query=nome-do-medicamento
 */
router.get("/pipeline", async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: "Parâmetro 'query' obrigatório" });
  }

  console.log(`⚡ Chamando pipeline Groq para: ${query}`);

  const result = await runGroqPipeline(query);
  res.json(result);
});

export default router;
