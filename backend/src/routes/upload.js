const router = require('express').Router();
router.get('/', (req, res) => res.json({ message: 'coming in part 8' }));
module.exports = router;
