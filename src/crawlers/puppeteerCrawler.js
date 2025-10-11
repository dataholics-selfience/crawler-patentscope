// src/crawlers/puppeteerCrawler.js
import puppeteer from "puppeteer";

/**
 * Função principal: faz o scraping básico do PatentScope com o termo de medicamento.
 * Se não conseguir, retorna null (permitindo fallback para outros crawlers).
 */
export async function puppeteerCrawler(medicine) {
  console.log(`🧭 PuppeteerCrawler iniciado para: ${medicine}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ],
    });

    const page = await browser.newPage();
    const searchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(medicine)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Espera algum seletor típico do PatentScope carregar
    await page.waitForSelector(".result", { timeout: 15000 }).catch(() => null);

    const html = await page.content();
    console.log(`✅ PuppeteerCrawler finalizado para: ${medicine}`);
    return html;
  } catch (err) {
    console.error("❌ Erro no PuppeteerCrawler:", err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
