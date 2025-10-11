// src/crawlers/playwrightCrawler.js
import { chromium } from "playwright";

/**
 * PlaywrightCrawler: fallback mais estável que o Puppeteer para páginas com Cloudflare.
 */
export async function playwrightCrawler(medicine) {
  console.log(`🧭 PlaywrightCrawler iniciado para: ${medicine}`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    const searchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(medicine)}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Espera um seletor comum de resultados
    await page.waitForSelector(".result", { timeout: 15000 }).catch(() => null);

    const html = await page.content();
    console.log(`✅ PlaywrightCrawler finalizado para: ${medicine}`);
    return html;
  } catch (err) {
    console.error("❌ Erro no PlaywrightCrawler:", err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
