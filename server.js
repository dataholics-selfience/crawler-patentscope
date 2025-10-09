import express from "express";
import puppeteer from "puppeteer";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 8080;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/data/patentscope/patents", async (req, res) => {
  const medicine = req.query.medicine;
  console.log(`🔍 Buscando patentes WIPO para: ${medicine}`);

  if (!medicine) {
    return res.status(400).json({ error: "Parâmetro 'medicine' é obrigatório" });
  }

  try {
    const html = await fetchRenderedHTML(`https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(medicine)}`);

    const parsed = extractPatentData(html);

    // Se não encontrou nada, tenta fallback Groq
    if (!parsed || parsed.length === 0) {
      console.log("⚠️ Nenhum resultado direto — tentando fallback Groq...");
      const groqData = await fallbackGroq(html, medicine);
      return res.json({ source: "groq", data: groqData });
    }

    return res.json({ source: "wipo", data: parsed });

  } catch (error) {
    console.error("❌ Erro geral:", error);
    return res.status(500).json({ error: "Falha ao buscar dados da WIPO" });
  }
});

async function fetchRenderedHTML(url) {
  console.log("🌐 Renderizando página com Puppeteer:", url);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // substitui page.waitForTimeout

  const content = await page.content();
  await browser.close();
  return content;
}

function extractPatentData(html) {
  const regex = /<div class="resultTitle">([\s\S]*?)<\/div>/g;
  const matches = [...html.matchAll(regex)];
  return matches.map(m => {
    const raw = m[1].replace(/<[^>]*>?/gm, "").trim();
    return { title: raw };
  });
}

async function fallbackGroq(html, query) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em extração de dados de patentes da WIPO."
          },
          {
            role: "user",
            content: `Extraia as patentes mencionadas relacionadas ao termo '${query}' deste HTML:\n${html.substring(0, 4000)}`
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return [{ parsed_text: text }];
  } catch (err) {
    console.error("⚠️ Falha no fallback Groq:", err);
    return [];
  }
}

app.listen(PORT, () => {
  console.log(`🚀 WIPO Parser robusto rodando na porta ${PORT}`);
});
