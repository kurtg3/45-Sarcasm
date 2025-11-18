const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');

// GET all products
router.get('/', productsController.getAllProducts);

// GET products by category
router.get('/category/:category', productsController.getProductsByCategory);

// Search products
router.get('/search', productsController.searchProducts);

// GET single product
router.get('/:id', productsController.getProductById);

// Invalidate cache (for admin/development)
router.post('/cache/invalidate', productsController.invalidateCache);

module.exports = router;
