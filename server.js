import express from "express";
import puppeteer from "puppeteer";
import cheerio from "cheerio";
import Groq from "groq-sdk";

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração do cliente Groq (para fallback)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "sk-fake-for-local"
});

// Função robusta para renderizar e capturar HTML
async function fetchRenderedHTML(url, retries = 3) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    // Bloqueia recursos pesados
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) req.abort();
      else req.continue();
    });

    // Navega e espera o conteúdo
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector("table.search-result", { timeout: 20000 });

    const html = await page.content();
    await browser.close();
    return html;

  } catch (err) {
    if (browser) await browser.close();
    console.warn(`⚠️ Tentativa falhou (${3 - retries + 1}): ${err.message}`);
    if (retries > 0) return fetchRenderedHTML(url, retries - 1);
    throw new Error("Falha após múltiplas tentativas");
  }
}

// Parser principal WIPO
async function parseWIPOResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $("table.search-result tbody tr").each((i, el) => {
    const title = $(el).find("a").first().text().trim();
    const link = $(el).find("a").first().attr("href");
    const date = $(el).find("td:nth-child(3)").text().trim();

    if (title && link) {
      results.push({
        title,
        link: link.startsWith("http")
          ? link
          : `https://patentscope.wipo.int${link}`,
        date
      });
    }
  });

  return results;
}

// Fallback com Groq
async function groqFallback(query) {
  const prompt = `
Extraia até 10 patentes recentes relacionadas ao termo "${query}".
Retorne JSON com campos: title, publication_date, applicant, link (se disponível).
Fontes preferenciais: WIPO, EPO, USPTO, INPI.
`;
  const response = await groq.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    messages: [
      { role: "system", content: "Você é um parser de dados técnicos de patentes." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3
  });

  try {
    const text = response.choices[0].message.content;
    return JSON.parse(text);
  } catch {
    return [{ error: "Groq fallback sem dados parseáveis" }];
  }
}

// Endpoint principal
app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  if (!medicine)
    return res.status(400).json({ error: "Faltou parâmetro 'medicine'" });

  const searchURL = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(
    medicine
  )}`;

  console.log(`🔍 Buscando patentes WIPO para: ${medicine}`);
  console.log(`🌐 URL: ${searchURL}`);

  try {
    const html = await fetchRenderedHTML(searchURL);
    const data = await parseWIPOResults(html);

    if (data.length === 0) throw new Error("Nenhum resultado válido encontrado");

    res.json({
      source: "wipo",
      count: data.length,
      data
    });

  } catch (err) {
    console.error("❌ Erro geral:", err);
    console.log("🔁 Ativando fallback Groq...");

    const fallback = await groqFallback(medicine);
    res.json({
      source: "groq_fallback",
      data: fallback
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 WIPO Parser robusto rodando na porta ${PORT}`);
});
