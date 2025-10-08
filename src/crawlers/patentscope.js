const puppeteer = require('puppeteer');

class PatentScopeCrawler {
  constructor(options = {}) {
    this.groqApiKey = options.groqApiKey || null;
    this.browser = null;
  }

  async initialize() {
    console.log('🔹 Inicializando Puppeteer...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async searchPatents(medicine) {
    if (!this.browser) await this.initialize();

    const page = await this.browser.newPage();
    page.setDefaultNavigationTimeout(90000);

    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(
      medicine
    )})`;

    console.log(`🌐 Acessando ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Espera seletor alternativo
      console.log('⏳ Aguardando resultados...');
      await page.waitForSelector('a.titleLink, .resultList, .results, table', {
        timeout: 60000
      });

      console.log('✅ Resultados carregados, extraindo...');

      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('a.titleLink').forEach(a => {
          const row = a.closest('tr');
          const cells = row ? row.querySelectorAll('td') : [];
          items.push({
            title: a.innerText.trim(),
            link: a.href,
            publicationNumber: cells[0]?.innerText?.trim() || '',
            applicant: cells[2]?.innerText?.trim() || '',
            date: cells[3]?.innerText?.trim() || ''
          });
        });
        return items;
      });

      if (!results || results.length === 0) {
        console.warn('⚠️ Nenhum resultado estruturado encontrado, tentando fallback...');
        const html = await page.content();
        return [{ rawHtmlSnippet: html.slice(0, 1000) }];
      }

      console.log(`✅ ${results.length} patentes encontradas.`);
      return results;
    } catch (error) {
      console.error('❌ Patentscope scraping falhou:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      console.log('🧹 Fechando browser...');
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = PatentScopeCrawler;
