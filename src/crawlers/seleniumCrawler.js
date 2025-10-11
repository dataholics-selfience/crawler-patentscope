// src/crawlers/seleniumCrawler.js
import { Builder, By } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";

/**
 * SeleniumCrawler: fallback final, usado se Playwright e Puppeteer falharem.
 */
export async function seleniumCrawler(medicine) {
  console.log(`🧩 SeleniumCrawler iniciado para: ${medicine}`);
  let driver;

  try {
    const options = new chrome.Options();
    options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    const searchUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(medicine)}`;
    await driver.get(searchUrl);

    // espera resultados aparecerem
    await driver.sleep(5000);

    const html = await driver.getPageSource();
    console.log(`✅ SeleniumCrawler finalizado para: ${medicine}`);
    return html;
  } catch (err) {
    console.error("❌ Erro no SeleniumCrawler:", err.message);
    return null;
  } finally {
    if (driver) await driver.quit();
  }
}
