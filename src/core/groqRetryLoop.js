// src/core/groqRetryLoop.js
import { validatePatentHTML } from "../utils/htmlValidator.js";
import { crawlWithPuppeteer } from "../crawlers/puppeteerCrawler.js";
import { crawlWithPlaywright } from "../crawlers/playwrightCrawler.js";
import { crawlWithSelenium } from "../crawlers/seleniumCrawler.js";

/**
 * Executa o loop de tentativas de scraping usando múltiplos motores e valida o HTML.
 * Repassa o resultado válido para o pipeline de processamento Groq.
 */
export async function groqRetryLoop(query, maxRetries = 3) {
  const crawlers = [
    { name: "puppeteer", fn: crawlWithPuppeteer },
    { name: "playwright", fn: crawlWithPlaywright },
    { name: "selenium", fn: crawlWithSelenium },
  ];

  let html = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Tentativa ${attempt}/${maxRetries}...`);

    for (const crawler of crawlers) {
      try {
        console.log(`🚀 Rodando ${crawler.name}...`);
        html = await crawler.fn(query);

        if (validatePatentHTML(html)) {
          console.log(`✅ Sucesso com ${crawler.name} na tentativa ${attempt}`);
          return html;
        } else {
          console.warn(`⚠️ HTML inválido retornado por ${crawler.name}`);
        }
      } catch (err) {
        console.error(`❌ Erro em ${crawler.name}:`, err.message);
      }
    }

    console.log("⏳ Aguardando antes da próxima tentativa...");
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("❌ Falha: nenhum crawler retornou HTML válido após todas as tentativas.");
}
