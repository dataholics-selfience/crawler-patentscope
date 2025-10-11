// src/crawlers/puppeteerCrawler.js
import puppeteer from "puppeteer";

/**
 * Crawler genérico com Puppeteer
 * @param {string} url - URL a ser visitada
 * @returns {Promise<{ html: string, title: string }>}
 */
export async function crawlWithPuppeteer(url) {
  console.log(`🚀 Puppeteer iniciando scrape de: ${url}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const html = await page.content();
    const title = await page.title();

    console.log(`✅ Puppeteer coletou página: ${title}`);
    return { html, title };
  } catch (err) {
    console.error("❌ Erro Puppeteer:", err.message);
    return { html: "", title: "", error: err.message };
  } finally {
    await browser.close();
  }
}
