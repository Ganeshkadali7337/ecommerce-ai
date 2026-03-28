const router = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { esClient } = require('../config/db');
const AiLog = require('../models/AiLog');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * @swagger
 * tags:
 *   name: AI
 * /api/ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with AI shopping assistant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string, example: "I need a warm hoodie under $80" }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let products = '';
    try {
      const result = await esClient.search({
        index: 'products',
        body: {
          query: { multi_match: { query: message, fields: ['name', 'description', 'category'], fuzziness: 'AUTO' } },
          size: 4,
        },
      });
      products = result.hits.hits
        .map(h => `- ${h._source.name} ($${h._source.price}) in ${h._source.category}`)
        .join('\n');
    } catch {}

    const prompt = `You are a shopping assistant for SHOPAI, a fashion store selling t-shirts, hoodies, jeans, sneakers, and accessories.

Your rules:
- Only answer questions about products, shopping, sizing, style advice, or store-related topics
- If asked anything unrelated (coding, politics, general knowledge, etc.), politely say: "I can only help with shopping and product questions."
- Never make up products. Only recommend from the list provided below
- Keep replies to 2-3 sentences max
- If no products match, suggest browsing a relevant category instead
${products ? `\nAvailable products matching the query:\n${products}` : '\nNo specific products found for this query.'}

Customer message: ${message}
Your response:`;

    const aiResult = await chatModel.generateContent(prompt);
    const reply = aiResult.response.text();

    AiLog.create({ type: 'chat', prompt: message, response: reply, model: 'gemini-2.5-flash' }).catch(() => {});

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/ai/logs:
 *   get:
 *     tags: [AI]
 *     summary: Get AI usage logs
 *     security:
 *       - bearerAuth: []
 */
router.get('/logs', async (_req, res) => {
  try {
    const logs = await AiLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
