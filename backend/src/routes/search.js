const router = require('express').Router();
const { esClient } = require('../config/db');

/**
 * @swagger
 * tags:
 *   name: Search
 * /api/search:
 *   get:
 *     tags: [Search]
 *     summary: Full-text product search with filters
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: minRating
 *         schema: { type: number }
 */
router.get('/', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, minRating } = req.query;

    const must = [];
    const filter = [];

    if (q) {
      must.push({
        multi_match: {
          query: q,
          fields: ['name^3', 'description', 'category'],
          fuzziness: 'AUTO',
        },
      });
    } else {
      must.push({ match_all: {} });
    }

    if (category) filter.push({ term: { category } });
    if (minPrice || maxPrice) {
      filter.push({ range: { price: { gte: minPrice || 0, lte: maxPrice || 999999 } } });
    }
    if (minRating) {
      filter.push({ range: { rating: { gte: parseFloat(minRating) } } });
    }

    const result = await esClient.search({
      index: 'products',
      body: {
        query: { bool: { must, filter } },
        size: 20,
      },
    });

    const products = result.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));

    res.json({ products, total: result.hits.total.value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/search/autocomplete:
 *   get:
 *     tags: [Search]
 *     summary: Autocomplete suggestions
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const result = await esClient.search({
      index: 'products',
      body: {
        query: {
          multi_match: {
            query: q,
            fields: ['name^3', 'category'],
            fuzziness: 'AUTO',
          },
        },
        _source: ['name', 'category'],
        size: 6,
      },
    });

    const suggestions = result.hits.hits.map(h => ({
      id: h._id,
      name: h._source.name,
      category: h._source.category,
    }));

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
