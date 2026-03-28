const router = require('express').Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const ActivityLog = require('../models/ActivityLog');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * @swagger
 * tags:
 *   name: Reviews
 * /api/reviews/{productId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews for a product
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 */
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(20);

    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    res.json({ reviews, avgRating: parseFloat(avgRating.toFixed(1)), total: reviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/reviews/{productId}:
 *   post:
 *     tags: [Reviews]
 *     summary: Add a review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, body]
 *             properties:
 *               rating: { type: integer, example: 5 }
 *               title: { type: string, example: "Great product" }
 *               body: { type: string, example: "Really happy with this purchase." }
 */
router.post('/:productId', auth, async (req, res) => {
  try {
    const { rating, title, body } = req.body;
    if (!rating || !body) return res.status(400).json({ error: 'Rating and body required' });

    const review = await Review.create({
      productId: req.params.productId,
      userId: req.user.id,
      userName: req.body.userName || 'User',
      rating,
      title,
      body,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/reviews/{productId}/summary:
 *   get:
 *     tags: [Reviews]
 *     summary: Get AI-generated review summary
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 */
router.get('/:productId/summary', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).limit(30);
    if (reviews.length === 0) return res.json({ summary: null });

    const reviewText = reviews
      .map(r => `${r.rating}/5: ${r.body}`)
      .join('\n');

    const result = await geminiModel.generateContent(
      `Summarize these product reviews in one sentence, like "Customers say it...". Reviews:\n${reviewText}`
    );

    const summary = result.response.text();
    const usage = result.response.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;
    const cost = parseFloat(((inputTokens * 0.000000075) + (outputTokens * 0.0000003)).toFixed(6));

    const AiLog = require('../models/AiLog');
    AiLog.create({ type: 'summary', prompt: reviewText.slice(0, 200), response: summary, model: 'gemini-2.5-flash', tokensUsed: inputTokens + outputTokens, cost }).catch(() => {});

    res.json({ summary, cost, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/reviews/activity/log:
 *   post:
 *     tags: [Reviews]
 *     summary: Log user activity
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, example: "view" }
 *               productId: { type: string, example: "paste-product-id-here" }
 *               query: { type: string, example: "hoodies" }
 */
router.post('/activity/log', auth, async (req, res) => {
  try {
    const { type, productId, query, metadata } = req.body;
    await ActivityLog.create({ userId: req.user.id, type, productId, query, metadata });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/reviews/activity/history:
 *   get:
 *     tags: [Reviews]
 *     summary: Get user's browsing history
 *     security:
 *       - bearerAuth: []
 */
router.get('/activity/history', auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
