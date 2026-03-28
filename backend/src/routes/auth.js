const router = require('express').Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 */
router.post('/register', (req, res) => res.json({ message: 'coming in part 2' }));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 */
router.post('/login', (req, res) => res.json({ message: 'coming in part 2' }));

module.exports = router;
