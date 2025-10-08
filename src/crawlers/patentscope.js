const puppeteer = require('puppeteer');
const axios = require('axios');
const logger = require('../utils/logger');

class PatentScopeCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    logger.info('Initializing PatentScope crawler');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    logger.info('PatentScope crawler initialized');
  }

  async detectFields() {
    logger.info('Detecting search fields on PatentScope...');

    // Tenta heurística padrão primeiro
    const fallbackSelectors = [
      'input[name="searchText"]',
      'input[type="text"]',
      'input[placeholder*="Search"]',
      '#simpleSearchForm input',
      'form[action*="search"] input'
    ];

    for (const selector of fallbackSelectors) {
      const exists = await this.page.$(selector);
      if (exists) {
        logger.info(`Detected search field via fallback: ${selector}`);
        return selector;
      }
    }

    // Usa GROQ como fallback inteligente
    try {
      const screenshot = await this.page.screenshot({ encoding: 'base64' });
      const groqResp = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'You are a web structure analyzer. Identify the selector of the search input on the given HTML screenshot.'
            },
            {
              role: 'user',
              content:
                'Here is a screenshot of the PatentScope search page (base64): ' +
                screenshot
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = groqResp.data.choices?.[0]?.message?.content || '';
      const selector = content.match(/[#.a-zA-Z0-9_\-\[\]="']+/)?.[0];
      if (selector) {
        logger.info(`GROQ detected selector: ${selector}`);
        return selector;
      }
    } catch (err) {
      logger.error('GROQ detection failed', err);
    }

    throw new Error('Search field not found');
  }

  async searchPatents(term) {
    logger.info(`Starting PatentScope search for: ${term}`);
    try {
      await this.page.goto('https://patentscope.wipo.int/search/en/search.jsf', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      const searchSelector = await this.detectFields();
      await this.page.waitForSelector(searchSelector, { timeout: 10000 });

      await this.page.click(searchSelector, { clickCount: 3 });
      await this.page.type(searchSelector, term);
      await Promise.all([
        this.page.keyboard.press('Enter'),
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' })
      ]);

      logger.info('Extracting results...');
      const results = await this.page.evaluate(() => {
        const rows = Array.from(
          document.querySelectorAll('.resultItem, .result')
        );
        return rows.slice(0, 10).map(r => ({
          title: r.querySelector('a, .title')?.innerText?.trim() || null,
          applicant:
            r.querySelector('.applicant, .assignee')?.innerText?.trim() || null,
          publication:
            r.querySelector('.pubnum, .patentNumber')?.innerText?.trim() ||
            null,
          date:
            r.querySelector('.pubdate, .date')?.innerText?.trim() || null,
          link:
            r.querySelector('a')?.href?.startsWith('http')
              ? r.querySelector('a').href
              : null
        }));
      });

      logger.info(`Found ${results.length} results`);
      return results;
    } catch (err) {
      logger.error('PatentScope search failed', err);
      throw err;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('PatentScope crawler closed');
    }
  }
}

module.exports = PatentScopeCrawler;
