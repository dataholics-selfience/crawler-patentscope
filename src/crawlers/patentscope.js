const puppeteer = require('puppeteer');
const axios = require('axios');
const logger = require('../utils/logger');

class PatentScopeCrawler {
  constructor(options = {}) {
    this.groqApiKey = options.groqApiKey || process.env.GROQ_API_KEY;
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      });
      this.page = await this.browser.newPage();
      logger.info('PatentScope crawler initialized');
    } catch (err) {
      logger.error('Failed to initialize Puppeteer', err);
      throw err;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('PatentScope crawler closed');
    }
  }

  async searchPatents(medicine) {
    try {
      // Passo 1: tentar via Groq se disponível
      if (this.groqApiKey) {
        try {
          const response = await axios.post(
            'https://api.groq.ai/v1/query',
            {
              query: `
                query {
                  patents(medicine: "${medicine}") {
                    title
                    publicationNumber
                    publicationDate
                    applicants
                    abstract
                    url
                  }
                }
              `
            },
            {
              headers: {
                Authorization: `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          if (response.data && response.data.patents) {
            logger.info(`Groq returned ${response.data.patents.length} results`);
            return response.data.patents;
          }
        } catch (groqErr) {
          logger.warn('Groq query failed, falling back to Puppeteer', groqErr.message);
        }
      }

      // Passo 2: fallback com Puppeteer
      const searchUrl = `https://patentscope.wipo.int/search/en/search.jsf`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Digitar no campo de busca
      const searchInputSelector = 'input[name="simpleSearch:searchExpression"]';
      await this.page.waitForSelector(searchInputSelector, { timeout: 10000 });
      await this.page.type(searchInputSelector, medicine);

      // Clicar em pesquisar
      const searchButtonSelector = 'input[type="submit"], button[type="submit"]';
      await this.page.click(searchButtonSelector);

      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Extrair resultados
      const patents = await this.page.evaluate(() => {
        const rows = document.querySelectorAll('table.results tr');
        const results = [];
        rows.forEach(row => {
          const tds = row.querySelectorAll('td');
          if (tds.length) {
            results.push({
              title: tds[0]?.innerText.trim(),
              publicationNumber: tds[1]?.innerText.trim(),
              publicationDate: tds[2]?.innerText.trim(),
              applicants: tds[3]?.innerText.trim(),
              abstract: tds[4]?.innerText.trim(),
              url: tds[0]?.querySelector('a')?.href || ''
            });
          }
        });
        return results;
      });

      logger.info(`Puppeteer returned ${patents.length} results`);
      return patents;
    } catch (err) {
      logger.error('PatentScope search failed', err);
      throw err;
    }
  }
}

module.exports = PatentScopeCrawler;
