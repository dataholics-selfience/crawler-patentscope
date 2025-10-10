// server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Health check simples
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Endpoint /api/data/patentscope/patents com stub
app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine) return res.status(400).json({ error: "Query param 'medicine' missing" });

  // Retorno genérico para deploy inicial
  const results = [
    { title: "Stub Patent 1", link: "https://example.com/patent1" },
    { title: "Stub Patent 2", link: "https://example.com/patent2" },
  ];

  res.json({
    query: medicine,
    total_results: results.length,
    results,
    source: "stub",
  });
});

app.listen(PORT, () => console.log(`🚀 Patent Scope stub rodando na porta ${PORT}`));
