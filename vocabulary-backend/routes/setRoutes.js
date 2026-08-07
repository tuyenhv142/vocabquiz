const express = require('express');
const router = express.Router();
const setController = require('../controllers/setController');

router.get('/sets', setController.getSets);
router.post('/sets', setController.createSet);
router.post('/sets/seed-defaults', setController.seedDefaults);

router.get('/sets/:id', setController.getSetById);
router.put('/sets/:id', setController.updateSet);
router.delete('/sets/:id', setController.deleteSet);

router.put('/sets/:id/practice', setController.updatePracticeResult);
router.post('/sets/:id/clone', setController.cloneSet);
router.post('/sets/:id/share-email', setController.shareEmail);

module.exports = router;
