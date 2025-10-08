const puppeteer = require('puppeteer');
const { groqFetch } = require('groq-sdk'); // Ajuste conforme seu SDK atual
const logger = require('../utils/logger');

class PatentScopeCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    logger.info('Initializing PatentScope crawler...');
    this.browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    logger.info('PatentScope crawler initialized');
  }

  async searchPatents(medicine) {
    const queryUrl = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;
    logger.info(`Navigating to: ${queryUrl}`);

    try {
      await this.page.goto(queryUrl, { waitUntil: 'networkidle2' });

      // Espera pela tabela de resultados
      await this.page.waitForSelector('.result-table, .results-table', { timeout: 20000 });

      // Extrai os dados
      const patents = await this.page.$$eval('.result-table tbody tr', rows =>
        rows.map(row => {
          const title = row.querySelector('td.title a')?.innerText.trim() || '';
          const link = row.querySelector('td.title a')?.href || '';
          const publicationNumber = row.querySelector('td.publication-number')?.innerText.trim() || '';
          const date = row.querySelector('td.publication-date')?.innerText.trim() || '';
          const applicants = row.querySelector('td.applicants')?.innerText.trim() || '';
          return { title, link, publicationNumber, date, applicants };
        })
      );

      if (!patents.length) {
        throw new Error('No results found or page structure changed');
      }

      return patents;

    } catch (puppeteerError) {
      logger.warn('Puppeteer failed, trying Groq fallback...', puppeteerError);

      // Fallback via Groq
      try {
        const groqQuery = `*[_type == "patents" && medicine match "${medicine}"]{title, link, publicationNumber, date, applicants}`;
        const groqResults = await groqFetch(groqQuery, process.env.GROQ_API_KEY);
        if (!groqResults.length) throw new Error('Groq returned empty results');
        return groqResults;
      } catch (groqError) {
        logger.error('Groq fallback failed', groqError);
        throw new Error(`No results found via Puppeteer or Groq for ${medicine}`);
      }
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
    logger.info('PatentScope crawler closed');
  }
}

module.exports = PatentScopeCrawler;
