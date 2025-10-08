const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

dotenv.config();

const PatentScopeCrawler = require('./crawlers/patentscope');

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(
  morgan('combined', {
    stream: {
      write: msg => logger.info(msg.trim())
    }
  })
);

// Rate limit
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60
  })
);

// Health check rápido para Railway
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Patentscope route
app.get('/api/data/patentscope', async (req, res) => {
  const { medicine } = req.query;
  if (!medicine)
    return res
      .status(400)
      .json({ success: false, message: 'Missing medicine parameter' });

  const crawler = new PatentScopeCrawler({
    username: process.env.PATENTSCOPE_USERNAME,
    password: process.env.PATENTSCOPE_PASSWORD
  });

  try {
    await crawler.initialize();
    const patents = await crawler.searchPatents(medicine);
    res.json({ success: true, data: patents });
  } catch (err) {
    logger.error('Patentscope crawler failed', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Patentscope patents',
      message: err.message
    });
  } finally {
    await crawler.close();
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
