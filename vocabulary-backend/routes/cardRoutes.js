const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

router.get('/cards', cardController.getCards);
router.post('/cards', cardController.createCard);
router.put('/cards/:id', cardController.updateCard);
router.delete('/cards/:id', cardController.deleteCard);

router.post('/sets/:id/cards/batch', cardController.batchCreateCards);
router.put('/sets/:id/cards', cardController.updateSetCards);

module.exports = router;
