const router = require('express').Router();
const auth = require('../middleware/auth');
const { redis, prisma } = require('../config/db');

const CART_TTL = 60 * 60 * 24; // 24 hours

function cartKey(userId) {
  return `cart:${userId}`;
}

/**
 * @swagger
 * tags:
 *   name: Cart
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get current user's cart
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth, async (req, res) => {
  try {
    const raw = await redis.get(cartKey(req.user.id));
    const items = raw ? JSON.parse(raw) : [];

    if (items.length === 0) return res.json({ items: [], total: 0 });

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, imageUrl: true, stock: true },
    });

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const enriched = items.map(item => ({
      ...item,
      product: productMap[item.productId] || null,
    }));

    const total = enriched.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
    res.json({ items: enriched, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/cart:
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Not enough stock' });

    const raw = await redis.get(cartKey(req.user.id));
    const items = raw ? JSON.parse(raw) : [];

    const existing = items.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, quantity });
    }

    await redis.setex(cartKey(req.user.id), CART_TTL, JSON.stringify(items));
    res.json({ message: 'Added to cart', itemCount: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/cart/{productId}:
 *   put:
 *     tags: [Cart]
 *     summary: Update item quantity
 *     security:
 *       - bearerAuth: []
 */
router.put('/:productId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const raw = await redis.get(cartKey(req.user.id));
    let items = raw ? JSON.parse(raw) : [];

    if (quantity <= 0) {
      items = items.filter(i => i.productId !== req.params.productId);
    } else {
      const item = items.find(i => i.productId === req.params.productId);
      if (item) item.quantity = quantity;
    }

    await redis.setex(cartKey(req.user.id), CART_TTL, JSON.stringify(items));
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/cart/{productId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:productId', auth, async (req, res) => {
  try {
    const raw = await redis.get(cartKey(req.user.id));
    let items = raw ? JSON.parse(raw) : [];
    items = items.filter(i => i.productId !== req.params.productId);
    await redis.setex(cartKey(req.user.id), CART_TTL, JSON.stringify(items));
    res.json({ message: 'Item removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear cart
 *     security:
 *       - bearerAuth: []
 */
router.delete('/', auth, async (req, res) => {
  try {
    await redis.del(cartKey(req.user.id));
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
