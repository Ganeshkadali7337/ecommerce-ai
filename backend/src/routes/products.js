const router = require('express').Router();
const { prisma, minioClient, esClient } = require('../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const ActivityLog = require('../models/ActivityLog');

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

    res.json({ products, total, page, pages: Math.ceil(total / limit) });
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
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, variants: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

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
 *     summary: Upload product image
 *     security:
 *       - bearerAuth: []
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
 * /api/products/categories:
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
