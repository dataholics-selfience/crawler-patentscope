const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const logger = require('../utils/logger');

class PatentScopeCrawler {
  constructor({ groqApiKey }) {
    this.groqApiKey = groqApiKey;
    this.browser = null;
  }

  async initialize() {
    logger.info('🔹 Inicializando Puppeteer...');
    this.browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async searchPatents(medicine) {
    try {
      const page = await this.browser.newPage();
      const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;

      logger.info(`🌐 Acessando ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      logger.info('⏳ Aguardando resultados...');
      await page.waitForSelector('.resultsTable', { timeout: 25000 }).catch(() => null);

      const html = await page.content();

      logger.info('✅ Resultados carregados, extraindo...');
      const patents = this.extractWithCheerio(html);

      if (patents.length === 0) {
        logger.warn('⚠️ Nenhum resultado estruturado encontrado, fallback Groq/RAW...');
        return [{ rawHtmlSnippet: html }];
      }

      return patents;
    } catch (err) {
      logger.error('Patentscope scraping failed:', err);
      return [];
    }
  }

  extractWithCheerio(html) {
    const $ = cheerio.load(html);
    const results = [];

    $('.resultsTable tr').each((i, row) => {
      const title = $(row).find('.titleColumn').text().trim();
      const number = $(row).find('.numberColumn').text().trim();
      const link = $(row).find('.titleColumn a').attr('href');

      if (title && number) {
        results.push({ title, number, link });
      }
    });

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('🧹 Browser fechado.');
    }
  }
}

module.exports = PatentScopeCrawler;

