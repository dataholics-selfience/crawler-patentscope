// src/crawlers/playwrightCrawler.js
import playwright from "playwright";

/**
 * Crawler genérico com Playwright
 * @param {string} url - URL a ser carregada
 * @returns {Promise<{ html: string, title: string }>}
 */
export async function crawlWithPlaywright(url) {
  console.log(`🚀 Playwright iniciando scrape de: ${url}`);
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const html = await page.content();
    const title = await page.title();

    console.log(`✅ Playwright coletou página: ${title}`);
    return { html, title };
  } catch (err) {
    console.error("❌ Erro Playwright:", err.message);
    return { html: "", title: "", error: err.message };
  } finally {
    await browser.close();
  }
}
