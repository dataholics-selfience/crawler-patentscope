// server.js
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Healthcheck simples
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Endpoint para buscar patentes
app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine) return res.status(400).json({ error: "Informe a query 'medicine'" });

  try {
    // Inicializa Puppeteer sem sandbox
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      headless: "new"
    });

    const page = await browser.newPage();
    const searchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;
    
    console.log("🔍 Acessando:", searchUrl);
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });

    // Espera os resultados carregarem (ajuste o seletor se necessário)
    await page.waitForSelector(".result-table, .results-list", { timeout: 15000 }).catch(() => {});

    const html = await page.content();
    await browser.close();

    // Parse simples com Cheerio
    const $ = cheerio.load(html);
    const results = [];
    $(".result-row, .patent-row").each((i, el) => {
      const title = $(el).find(".title, .patent-title").text().trim();
      const assignee = $(el).find(".assignee, .patent-holder").text().trim();
      const publication = $(el).find(".publication, .pub-number").text().trim();
      if (title) results.push({ title, assignee, publication });
    });

    res.json({
      query: medicine,
      total_results: results.length,
      results
    });

  } catch (err) {
    console.error("Erro ao buscar patentes:", err);
    res.status(500).json({ error: "Falha ao buscar patentes", details: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 WIPO Parser rodando na porta ${PORT}`));
