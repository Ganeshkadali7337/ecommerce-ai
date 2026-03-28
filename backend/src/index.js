require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const {
  connectMongo,
  initMinio,
  initElasticsearch,
  initQdrant,
} = require('./config/db');
const swaggerSpec = require('./config/swagger');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (added as each part is built)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/search', require('./routes/search'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/upload', require('./routes/upload'));

async function start() {
  await connectMongo();
  await initMinio();
  await initElasticsearch();
  await initQdrant();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

start().catch(console.error);
