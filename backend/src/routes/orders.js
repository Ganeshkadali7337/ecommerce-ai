const router = require('express').Router();
router.get('/', (req, res) => res.json({ message: 'coming in part 4' }));
module.exports = router;
