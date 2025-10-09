import puppeteer from "puppeteer";

export async function puppeteerCrawler(query, maxRetries = 5, waitTime = 5000) {
  let browser;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`🌐 Tentativa ${attempt} para buscar patentes: ${query}`);

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      const url = `https://patentscope.wipo.int/search/en/result.jsf?query=${encodeURIComponent(query)}`;

      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

      // Espera pelo seletor principal de resultados
      await page.waitForSelector(".result-title a", { timeout: 30000 });

      const html = await page.content();

      if (html && html.includes("result-title")) {
        console.log(`✅ HTML capturado com sucesso na tentativa ${attempt}`);
        await browser.close();
        return html;
      } else {
        console.warn(`⚠️ HTML incompleto, re-tentando...`);
      }
    } catch (err) {
      console.warn(`⚠️ Erro na tentativa ${attempt}: ${err.message}`);
    } finally {
      if (browser) await browser.close();
    }

    // Espera antes de tentar de novo
    await new Promise((res) => setTimeout(res, waitTime));
  }

  console.error(`❌ Não foi possível capturar HTML após ${maxRetries} tentativas`);
  return null;
}
