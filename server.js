require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const winston = require('winston');

const app = express();
app.use(cors());
app.use(express.json());

// Logger simples
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Rota principal: busca patentes
app.get('/api/data/patentscope/patents', async (req, res) => {
  const { medicine } = req.query;
  if (!medicine) return res.status(400).json({ error: 'Parâmetro "medicine" é obrigatório.' });

  try {
    logger.info(`🔍 Buscando patentes para: ${medicine}`);

    // URL interna que retorna JSON (simula XHR da página)
    const url = `https://patentscope.wipo.int/search/en/result.jsf?query=FP:(${encodeURIComponent(medicine)})`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/javascript'
      }
    });

    // Extrair registros do JSON da página
    const records = response.data.records || []; 

    const patents = records.map(p => ({
      title: p.title,
      publication_number: p.pubNumber,
      applicants: p.applicants,
      inventors: p.inventors,
      publication_date: p.pubDate,
      abstract: p.abstract,
      legal_status: p.legalStatus,
      family: p.family,
      link: `https://patentscope.wipo.int${p.detailUrl}`
    }));

    res.json({
      query: medicine,
      total_results: patents.length,
      results: patents
    });

    logger.info(`✅ Retornados ${patents.length} registros para: ${medicine}`);

  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Erro ao buscar patentes', details: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => logger.info(`🚀 WIPO Parser rodando na porta ${PORT}`));
