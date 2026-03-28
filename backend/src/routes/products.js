const router = require('express').Router();
const { prisma, minioClient, esClient, redis } = require('../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const ActivityLog = require('../models/ActivityLog');

const CACHE_TTL = 300; // 5 minutes

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * @swagger
 * tags:
 *   name: Products
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const where = req.query.category ? { category: { slug: req.query.category } } : {};

    const cacheKey = `products:list:${req.query.category || 'all'}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const result = { products, total, page, pages: Math.ceil(total / limit) };
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get single product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `products:single:${req.params.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, variants: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(product));

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const jwt = require('jsonwebtoken');
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        ActivityLog.create({ userId: user.id, type: 'view', productId: product.id }).catch(() => {});
      } catch {}
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create product (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Nike Air Max" }
 *               description: { type: string, example: "Classic running shoe" }
 *               price: { type: number, example: 99.99 }
 *               stock: { type: integer, example: 50 }
 *               categoryId: { type: string, example: "paste-category-id-here" }
 */
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, description, price, stock, categoryId, variants } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + uuid().slice(0, 6);

    const product = await prisma.product.create({
      data: {
        name, description, price, stock, categoryId, slug,
        variants: variants ? { create: variants } : undefined,
      },
      include: { category: true, variants: true },
    });

    await esClient.index({
      index: 'products',
      id: product.id,
      document: {
        name: product.name,
        description: product.description,
        category: product.category.name,
        price: product.price,
        rating: 0,
      },
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product (admin)
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, description, price, stock } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, description, price, stock },
      include: { category: true },
    });

    await esClient.update({
      index: 'products',
      id: product.id,
      doc: { name: product.name, description: product.description, price: product.price },
    });

    // Invalidate cache
    await redis.del(`products:single:${product.id}`);
    const keys = await redis.keys('products:list:*');
    if (keys.length) await redis.del(...keys);

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}/image:
 *   post:
 *     tags: [Products]
 *     summary: Upload product image (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 */
router.post('/:id/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = req.file.originalname.split('.').pop();
    const key = `products/${req.params.id}.${ext}`;
    const bucket = process.env.MINIO_BUCKET;

    await minioClient.putObject(bucket, key, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype,
    });

    const imageUrl = `http://localhost:9000/${bucket}/${key}`;
    await prisma.product.update({ where: { id: req.params.id }, data: { imageUrl } });
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/{id}/similar:
 *   get:
 *     tags: [Products]
 *     summary: Get similar products using vector search
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
router.get('/:id/similar', async (req, res) => {
  try {
    const { qdrantClient } = require('../config/db');
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let similar = [];
    try {
      const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const embModel = genai.getGenerativeModel({ model: 'gemini-embedding-001' });
      const text = `${product.name} ${product.description} ${product.category?.name || ''}`;
      const embResult = await embModel.embedContent(text);
      const vector = embResult.embedding.values;

      const results = await qdrantClient.search('products', {
        vector,
        limit: 5,
        filter: { must_not: [{ key: 'product_id', match: { value: product.id } }] },
      });

      const ids = results.map(r => r.payload?.product_id).filter(Boolean);
      similar = await prisma.product.findMany({
        where: { id: { in: ids } },
        include: { category: true },
      });
    } catch {
      // fallback: same category products
      similar = await prisma.product.findMany({
        where: { categoryId: product.categoryId, id: { not: product.id } },
        include: { category: true },
        take: 4,
      });
    }

    res.json(similar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/products/meta/categories:
 *   get:
 *     tags: [Products]
 *     summary: List all categories
 */
router.get('/meta/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
