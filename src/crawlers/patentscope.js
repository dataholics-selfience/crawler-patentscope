const puppeteer = require('puppeteer');

class PatentScopeCrawler {
  constructor(options = {}) {
    this.groqApiKey = options.groqApiKey || null;
    this.browser = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async searchPatents(medicine) {
    if (!this.browser) await this.initialize();

    const page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(
      medicine
    )})`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Espera o JS carregar os resultados
      await page.waitForFunction(
        () => document.querySelectorAll('.resultList table tbody tr').length > 0,
        { timeout: 25000 }
      );

      const results = await page.evaluate(() => {
        const rows = document.querySelectorAll('.resultList table tbody tr');
        return Array.from(rows).map(row => {
          const cells = row.querySelectorAll('td');
          const titleEl = row.querySelector('a.titleLink');
          return {
            title: titleEl ? titleEl.innerText.trim() : cells[1]?.innerText?.trim() || '',
            link: titleEl ? titleEl.href : '',
            publicationNumber: cells[0]?.innerText?.trim() || '',
            applicant: cells[2]?.innerText?.trim() || '',
            date: cells[3]?.innerText?.trim() || ''
          };
        });
      });

      if (!results || results.length === 0) {
        throw new Error('No results found or unable to parse table');
      }

      return results;
    } catch (error) {
      console.error('Patentscope scraping failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = PatentScopeCrawler;
