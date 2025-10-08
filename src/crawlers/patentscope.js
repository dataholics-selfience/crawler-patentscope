// src/crawlers/patentscope.js
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class PatentScopeCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    logger.info('Initializing PatentScope crawler...');
    this.browser = await puppeteer.launch({
      headless: 'new', // nova implementação de headless
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    // Timeout maior para sites lentos
    this.page.setDefaultNavigationTimeout(60000);
    this.page.setDefaultTimeout(60000);
    logger.info('PatentScope crawler initialized');
  }

  async searchPatents(medicine) {
    if (!medicine) throw new Error('Medicine parameter is required');

    try {
      // Monta a URL de resultados diretamente
      const baseUrl = 'https://patentscope.wipo.int/search/en/result.jsf';
      const query = `FP:(${medicine})`;
      const url = `${baseUrl}?query=${encodeURIComponent(query)}`;

      logger.info(`Opening Patentscope URL: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });

      // Espera a tabela de resultados aparecer
      await this.page.waitForSelector('.result-table, .results-table', { timeout: 15000 });

      // Extrai os dados
      const patents = await this.page.$$eval('.result-table tr, .results-table tr', rows => {
        return rows.slice(1).map(row => {
          const cells = row.querySelectorAll('td');
          return {
            title: cells[0]?.innerText.trim() || '',
            publicationNumber: cells[1]?.innerText.trim() || '',
            publicationDate: cells[2]?.innerText.trim() || '',
            applicant: cells[3]?.innerText.trim() || '',
            country: cells[4]?.innerText.trim() || ''
          };
        });
      });

      logger.info(`Found ${patents.length} patents`);
      return patents;

    } catch (err) {
      logger.error('Patentscope search failed', err);
      throw err;
    }
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
    logger.info('PatentScope crawler closed');
  }
}

module.exports = PatentScopeCrawler;
