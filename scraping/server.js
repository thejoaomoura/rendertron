const express = require('express');
const rendertron = require('rendertron-middleware');
const scrapePinterest = require('./scraping/pinterestScraper');

const app = express();

// Configuração do middleware Rendertron
app.use(rendertron.makeMiddleware({
  proxyUrl: 'https://yakuzabot-apis.onrender.com',
}));

// Endpoint para iniciar o scraping
app.get('/startScraping', async (req, res) => {
  try {
    const videoBuffer = await scrapePinterest();
    if (videoBuffer) {
      res.send(videoBuffer);
    } else {
      res.status(404).send('Nenhum vídeo encontrado.');
    }
  } catch (error) {
    res.status(500).send('Erro ao fazer scraping.');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
