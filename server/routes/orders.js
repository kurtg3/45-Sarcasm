const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

// Create new order
router.post('/', ordersController.createOrder);

// Get order by ID
router.get('/:orderId', ordersController.getOrder);

// Calculate shipping cost
router.post('/shipping/calculate', ordersController.calculateShipping);

// Send order to production
router.post('/:orderId/production', ordersController.sendToProduction);

module.exports = router;
