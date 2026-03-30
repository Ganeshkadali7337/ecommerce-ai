const router = require('express').Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const { esClient, connectMongo } = require('../config/db');
const AiLog = require('../models/AiLog');
const ChatHistory = require('../models/ChatHistory');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

// LangChain chat model for conversation with memory
const lcChatModel = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
});

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
    await connectMongo();
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Get userId from JWT if logged in, else fall back to IP
    let userId = req.headers['x-user-id'] || req.ip || 'anonymous';
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        userId = decoded.id;
      }
    } catch {}

    // Load history from MongoDB
    let historyDoc = await ChatHistory.findOne({ userId });
    if (!historyDoc) historyDoc = new ChatHistory({ userId, messages: [] });
    const history = historyDoc.messages.map(m =>
      m.role === 'human' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Step 1 — Detect intent
    const intentPrompt = `You are an intent detector for a fashion e-commerce store (SHOPAI).
Analyze the customer message and respond with JSON only. No explanation, no markdown, just raw JSON.

Rules:
- "product_search" → user is asking about products, looking for recommendations, asking about price/style/category
- "general_chat" → greetings, general questions, unrelated topics, thank you, etc.

Response format: {"intent": "product_search" | "general_chat", "query": "extracted search query or null"}

Examples:
"hi" → {"intent": "general_chat", "query": null}
"I need a warm hoodie under $80" → {"intent": "product_search", "query": "warm hoodie under 80"}
"show me sneakers" → {"intent": "product_search", "query": "sneakers"}
"what jeans do you have?" → {"intent": "product_search", "query": "jeans"}
"thanks!" → {"intent": "general_chat", "query": null}
"do you have anything for winter?" → {"intent": "product_search", "query": "winter clothing warm"}

Customer message: "${message}"`;

    const intentResult = await chatModel.generateContent(intentPrompt);
    const intentUsage = intentResult.response.usageMetadata || {};
    totalInputTokens += intentUsage.promptTokenCount || 0;
    totalOutputTokens += intentUsage.candidatesTokenCount || 0;

    let intent = 'general_chat';
    let searchQuery = null;
    try {
      const raw = intentResult.response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);
      intent = parsed.intent || 'general_chat';
      searchQuery = parsed.query || null;
    } catch {}

    // Step 2 — If product search, query Elasticsearch
    let productList = [];
    let productsText = '';
    if (intent === 'product_search' && searchQuery) {
      try {
        const result = await esClient.search({
          index: 'products',
          body: {
            query: {
              multi_match: {
                query: searchQuery,
                fields: ['name^3', 'description', 'category'],
                fuzziness: 'AUTO',
              },
            },
            size: 5,
          },
        });
        productList = result.hits.hits.map(h => ({
          name: h._source.name,
          price: h._source.price,
          category: h._source.category,
          description: h._source.description,
        }));
        productsText = productList
          .map(p => `- ${p.name} ($${p.price}) — ${p.category}: ${p.description}`)
          .join('\n');
      } catch {}
    }

    // Step 3 — Build prompt with context
    let systemPrompt;
    if (intent === 'general_chat') {
      systemPrompt = `You are a friendly shopping assistant for SHOPAI, a fashion store selling t-shirts, hoodies, jeans, sneakers, and accessories.
Rules:
- For greetings, be warm and friendly, invite them to ask about products
- If asked anything unrelated (coding, politics, etc.), politely say you can only help with shopping
- Keep replies short — 1-2 sentences max`;
    } else {
      systemPrompt = `You are a shopping assistant for SHOPAI, a fashion store.
Rules:
- Recommend ONLY from the product list below — never make up products
- Present matching products as bullet points with name, price, and a short reason why it fits
- If no products found, suggest browsing the relevant category
- Keep it concise and helpful
${productsText ? `\nMatching products:\n${productsText}` : '\nNo products found for this query.'}`;
    }

    // Step 4 — Build messages: SystemMessage + past history + current HumanMessage
    const messages = [
      new SystemMessage(systemPrompt),
      ...history,
      new HumanMessage(message),
    ];

    // Step 5 — Call LangChain model with full history
    const lcResult = await lcChatModel.invoke(messages);
    const reply = lcResult.content;

    // Step 6 — Save this turn to MongoDB
    historyDoc.messages.push({ role: 'human', content: message });
    historyDoc.messages.push({ role: 'ai', content: reply });
    // Keep last 20 messages (10 turns) to avoid unbounded growth
    if (historyDoc.messages.length > 20) historyDoc.messages = historyDoc.messages.slice(-20);
    historyDoc.updatedAt = new Date();
    await historyDoc.save();

    totalInputTokens += lcResult.usageMetadata?.inputTokenCount || 0;
    totalOutputTokens += lcResult.usageMetadata?.outputTokenCount || 0;

    // gemini-2.5-flash pricing: $0.075/1M input, $0.30/1M output
    const cost = parseFloat(((totalInputTokens * 0.000000075) + (totalOutputTokens * 0.0000003)).toFixed(6));

    AiLog.create({ type: 'chat', prompt: message, response: reply, model: 'gemini-2.5-flash', tokensUsed: totalInputTokens + totalOutputTokens, cost }).catch(() => {});

    res.json({ reply, cost, tokensUsed: totalInputTokens + totalOutputTokens });
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
    await connectMongo();
    const logs = await AiLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
