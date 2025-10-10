// src/crawlers/puppeteerCrawler.js
import puppeteer from "puppeteer";

export async function puppeteerCrawler(medicine) {
  console.log(`🔍 Puppeteer iniciando busca na WIPO para: ${medicine}`);
  const url = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(
    medicine
  )}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Espera elemento-chave (para confirmar carregamento da página)
    await page.waitForSelector(".result-title a", { timeout: 30000 });

    const html = await page.content();
    console.log(`✅ Puppeteer retornou HTML válido (${html.length} chars)`);

    return html;
  } catch (err) {
    console.error("❌ Erro no Puppeteer:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}
