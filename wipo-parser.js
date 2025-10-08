import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const WIPO_URL = process.env.WIPO_URL || 'https://example.com/sample-patent';

async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Node.js)'
      }
    });
    return data;
  } catch (err) {
    console.error('Erro ao buscar HTML:', err.message);
    throw err;
  }
}

function parsePatentHTML(html) {
  const $ = cheerio.load(html);

  // Exemplo de parse
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const inventors = [];
  $('meta[name="inventor"]').each((i, el) => {
    inventors.push($(el).attr('content'));
  });

  return {
    title,
    description,
    inventors
  };
}

async function main() {
  console.log('Iniciando parser WIPO...');
  const html = await fetchHTML(WIPO_URL);
  const patentData = parsePatentHTML(html);

  // Salva JSON no filesystem (Railway mantém persistência limitada)
  fs.writeFileSync('wipo-patent.json', JSON.stringify(patentData, null, 2));
  console.log('JSON gerado: wipo-patent.json');
  console.log(patentData);
}

main();
