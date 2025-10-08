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
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1200, height: 800 });
    logger.info('PatentScope crawler initialized');
  }

  async searchPatents(medicine) {
    const query = encodeURIComponent(medicine);
    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${query})`;

    logger.info(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    try {
      // Espera pelos resultados aparecerem (cada resultado é .result-item)
      await this.page.waitForSelector('.result-item', { timeout: 15000 });
    } catch (err) {
      logger.error('No results loaded', err);
      throw new Error('No results found or page structure changed');
    }

    // Extrai os dados de cada patente
    const patents = await this.page.$$eval('.result-item', items =>
      items.map(item => {
        const title = item.querySelector('.title a')?.innerText.trim() || '';
        const link = item.querySelector('.title a')?.href || '';
        const publicationNumber = item.querySelector('.publication-number')?.innerText.trim() || '';
        const date = item.querySelector('.publication-date')?.innerText.trim() || '';
        const applicants = item.querySelector('.applicants')?.innerText.trim() || '';
        return { title, link, publicationNumber, date, applicants };
      })
    );

    logger.info(`Found ${patents.length} patents for "${medicine}"`);
    return patents;
  }

  async close() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
    logger.info('PatentScope crawler closed');
  }
}

module.exports = PatentScopeCrawler;
