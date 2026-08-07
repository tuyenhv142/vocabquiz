const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/admin/stats', adminController.getAdminStats);

router.get('/admin/users', adminController.getAllUsers);
router.delete('/admin/users/:id', adminController.deleteUserByAdmin);

router.get('/admin/sets', adminController.getAllSets);
router.delete('/admin/sets/:id', adminController.deleteSetByAdmin);

router.get('/admin/cards', adminController.getAllCards);

module.exports = router;
