const router = require('express').Router();
const auth = require('../middleware/auth');
const { prisma, redis } = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { generateInvoice } = require('../services/invoice');

/**
 * @swagger
 * tags:
 *   name: Orders
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get user's order history
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get single order
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        items: { include: { product: true } },
        payment: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Checkout - create order and Stripe payment intent
 *     security:
 *       - bearerAuth: []
 */
router.post('/checkout', auth, async (req, res) => {
  try {
    const raw = await redis.get(`cart:${req.user.id}`);
    if (!raw) return res.status(400).json({ error: 'Cart is empty' });

    const cartItems = JSON.parse(raw);
    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    const productIds = cartItems.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const orderItems = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: productMap[item.productId].price,
    }));

    const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      metadata: { userId: req.user.id },
    });

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        total,
        status: 'pending',
        items: { create: orderItems },
        payment: {
          create: {
            stripePaymentId: paymentIntent.id,
            amount: total,
            status: 'pending',
          },
        },
      },
      include: { items: true, payment: true },
    });

    res.json({ order, clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}/confirm:
 *   post:
 *     tags: [Orders]
 *     summary: Confirm payment and finalize order
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: { include: { product: true } }, payment: true, user: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await redis.del(`cart:${req.user.id}`);

    const invoiceUrl = await generateInvoice(order);

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'paid',
        invoiceUrl,
        payment: { update: { status: 'paid' } },
      },
      include: { items: { include: { product: true } }, payment: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
