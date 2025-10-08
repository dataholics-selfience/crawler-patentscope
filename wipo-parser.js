// wipo-parser.js
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * GET /api/data/patentscope/patents?medicine=semaglutide
 * Retorna JSON completo das patentes relacionadas à medicina passada
 */
app.get('/api/data/patentscope/patents', async (req, res) => {
  const { medicine } = req.query;

  if (!medicine) {
    return res.status(400).json({ error: 'Parâmetro "medicine" é obrigatório.' });
  }

  try {
    const url = `https://patentscope.wipo.int/search/en/detail.jsf?query=${encodeURIComponent(medicine)}`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const html = await page.content();
    const $ = cheerio.load(html);

    const patents = [];

    $('.resultItem').each((i, el) => {
      const $el = $(el);

      // Tenta extrair campos principais
      const title = $el.find('.title').text().trim();
      const publication_number = $el.find('.pubNumber').text().trim();
      const applicants = $el.find('.applicant').text().trim();
      const inventors = $el.find('.inventor').text().trim();
      const publication_date = $el.find('.pubDate').text().trim();
      const abstract_text = $el.find('.abstract').text().trim();
      const status = $el.find('.legalStatus').text().trim();
      const family = $el.find('.family').text().trim();
      const link = 'https://patentscope.wipo.int' + $el.find('a').attr('href');

      patents.push({
        title,
        publication_number,
        applicants,
        inventors,
        publication_date,
        abstract: abstract_text,
        legal_status: status,
        family: family,
        link,
      });
    });

    await browser.close();

    res.json({
      query: medicine,
      total_results: patents.length,
      results: patents,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar a busca', details: error.message });
  }
});

// Start do servidor (Railway usa process.env.PORT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`WIPO Parser rodando na porta ${PORT}...`));
