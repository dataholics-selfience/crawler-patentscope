import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(helmet());
app.use(morgan("tiny"));
app.use(compression());

app.get("/health", (req, res) => res.send("OK"));

app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine) return res.status(400).json({ error: "Param 'medicine' is required" });

  try {
    console.log("🔍 Buscando patentes para:", medicine);

    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;
    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForTimeout(5000);

    const html = await page.content();
    const $ = cheerio.load(html);

    const results = [];
    $("tr[class*='resultRow']").each((i, el) => {
      const title = $(el).find("td:nth-child(2)").text().trim();
      const number = $(el).find("td:nth-child(1)").text().trim();
      const applicant = $(el).find("td:nth-child(3)").text().trim();

      if (number && title) {
        results.push({ number, title, applicant });
      }
    });

    await browser.close();

    res.json({
      query: medicine,
      total_results: results.length,
      results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar patentes" });
  }
});

app.listen(PORT, () => console.log(`🚀 WIPO Parser rodando na porta ${PORT}`));
