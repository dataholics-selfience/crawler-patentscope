const puppeteer = require('puppeteer');
const GroqParser = require('../services/groqParser'); // Certifique-se que exista

class PatentScopeCrawler {
  constructor(credentials = null) {
    this.browser = null;
    this.credentials = credentials;
    this.groqParser = new GroqParser();
  }

  async initialize() {
    console.log('Initializing PatentScope crawler');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    console.log('PatentScope crawler initialized');
  }

  async detectFieldsIntelligently(page) {
    console.log('Detecting form fields...');
    const html = await page.content();
    const groqFields = await this.groqParser.detectFields(html);

    if (groqFields && groqFields.loginField && groqFields.passwordField && groqFields.searchField) {
      console.log('Groq detected fields:', groqFields);
      return groqFields;
    }

    console.log('Groq failed, using fallback detection');
    return await this.fallbackDetection(page);
  }

  async fallbackDetection(page) {
    const detectedFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const fields = { loginField: null, passwordField: null, searchField: null, submitSelector: 'input[type="submit"]' };

      for (const input of inputs) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const attrs = name + id;

        if (!fields.loginField && (attrs.includes('login') || attrs.includes('usuario'))) fields.loginField = input.name || input.id;
        if (!fields.passwordField && (input.type === 'password' || attrs.includes('senha'))) fields.passwordField = input.name || input.id;
        if (!fields.searchField && (attrs.includes('expressao') || attrs.includes('palavra'))) fields.searchField = input.name || input.id;
      }

      return fields;
    });

    const fields = {
      loginField: detectedFields.loginField || 'username',
      passwordField: detectedFields.passwordField || 'password',
      searchField: detectedFields.searchField || 'query',
      submitSelector: 'input[type="submit"], button[type="submit"], button'
    };

    console.log('Fallback fields:', fields);
    return fields;
  }

  async performLogin(page, fields) {
    console.log('Performing login...');
    if (!this.credentials) return console.log('No credentials provided, skipping login');

    const loginInput = await page.$(`input[name="${fields.loginField}"], #${fields.loginField}`);
    const passwordInput = await page.$(`input[name="${fields.passwordField}"], #${fields.passwordField}`);

    if (!loginInput || !passwordInput) throw new Error('Login or password field not found');

    await loginInput.type(this.credentials.username, { delay: 100 });
    await passwordInput.type(this.credentials.password, { delay: 100 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click(fields.submitSelector)
    ]);

    const content = await page.content();
    if (content.includes('Login failed')) throw new Error('Login failed');

    console.log('Login successful');
  }

  async performSearch(page, fields, searchTerm) {
    console.log('Performing search...');
    const searchInput = await page.$(`input[name="${fields.searchField}"], #${fields.searchField}`);
    if (!searchInput) throw new Error('Search field not found');

    await searchInput.type(searchTerm, { delay: 100 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click(fields.submitSelector)
    ]);

    await page.waitForTimeout(2000);
    console.log('Search completed');
  }

  async extractResults(page) {
    console.log('Extracting results...');
    const results = await page.evaluate(() => {
      const patents = [];
      const rows = document.querySelectorAll('table tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          patents.push({
            processNumber: cells[0]?.innerText.trim() || '',
            title: cells[1]?.innerText.trim() || '',
            depositDate: cells[2]?.innerText.trim() || '',
            applicant: cells[3]?.innerText.trim() || '',
            fullText: row.innerText.trim(),
            source: 'PatentScope'
          });
        }
      });
      return patents;
    });

    console.log(`Extracted ${results.length} patents`);
    return results;
  }

  async searchPatents(medicine) {
    console.log(`Starting PatentScope search for: ${medicine}`);
    const page = await this.browser.newPage();

    try {
      const url = 'https://patentscope.wipo.int/search/en/basic.jsf'; // Ajuste se necessário
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Login se necessário
      const needsLogin = await page.evaluate(() => document.body.innerText.includes('Login'));
      if (needsLogin && this.credentials) {
        const loginFields = await this.detectFieldsIntelligently(page);
        await this.performLogin(page, loginFields);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(1000);
      }

      const searchFields = await this.detectFieldsIntelligently(page);
      await this.performSearch(page, searchFields, medicine);

      const patents = await this.extractResults(page);
      console.log(`PatentScope search completed: ${patents.length} patents found`);
      return patents;
    } catch (err) {
      console.error('PatentScope search error:', err.message);
      throw err;
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('PatentScope crawler closed');
    }
  }
}

module.exports = PatentScopeCrawler;
