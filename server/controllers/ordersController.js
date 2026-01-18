const printifyClient = require('../utils/printifyClient');
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');

// Validation rules for orders
const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shipping.firstName').trim().notEmpty().withMessage('First name is required'),
  body('shipping.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('shipping.address1').trim().notEmpty().withMessage('Address is required'),
  body('shipping.city').trim().notEmpty().withMessage('City is required'),
  body('shipping.country').trim().notEmpty().withMessage('Country is required'),
  body('shipping.zip').trim().notEmpty().withMessage('ZIP/Postal code is required'),
  body('customer.email').isEmail().withMessage('Valid email is required'),
  body('customer.name').trim().notEmpty().withMessage('Customer name is required')
];

const ordersController = {
  // Validation middleware
  validation: orderValidation,

  // Create new order
  createOrder: async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { items, shipping, customer, paymentConfirmed, paymentIntentId, subtotal, shippingCost, tax, total } = req.body;

      // Format order for Printify
      const printifyOrder = {
        external_id: `SM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        label: customer.email,
        line_items: items.map(item => ({
          product_id: item.productId || item.product_id,
          variant_id: item.variantId || item.variant_id,
          quantity: item.quantity
        })),
        shipping_method: 1,
        send_shipping_notification: true,
        address_to: {
          first_name: shipping.firstName || shipping.first_name,
          last_name: shipping.lastName || shipping.last_name,
          email: customer.email,
          phone: shipping.phone || customer.phone,
          country: shipping.country,
          region: shipping.state || shipping.region,
          address1: shipping.address1,
          address2: shipping.address2 || '',
          city: shipping.city,
          zip: shipping.zip || shipping.postal_code
        }
      };

      // Create order in Printify
      const printifyResponse = await printifyClient.createOrder(printifyOrder);

      // Save order to database
      const dbOrder = await Order.create({
        printify_order_id: printifyResponse.id,
        customer_email: customer.email,
        customer_name: customer.name,
        shipping_address: {
          firstName: shipping.firstName || shipping.first_name,
          lastName: shipping.lastName || shipping.last_name,
          address1: shipping.address1,
          address2: shipping.address2,
          city: shipping.city,
          state: shipping.state || shipping.region,
          zip: shipping.zip || shipping.postal_code,
          country: shipping.country,
          phone: shipping.phone || customer.phone
        },
        items: items.map(item => ({
          productId: item.productId || item.product_id,
          variantId: item.variantId || item.variant_id,
          title: item.title,
          variant: item.variant,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        subtotal: subtotal || 0,
        shipping_cost: shippingCost || 0,
        tax: tax || 0,
        total: total || subtotal || 0,
        payment_intent_id: paymentIntentId,
        status: 'pending',
        payment_status: paymentConfirmed ? 'paid' : 'pending'
      });

      // If payment confirmed, send to production
      if (paymentConfirmed) {
        try {
          await printifyClient.sendToProduction(printifyResponse.id);
          await Order.updateStatus(dbOrder.id, 'processing');
        } catch (productionError) {
          console.error('Error sending to production:', productionError);
        }
      }

      res.status(201).json({
        success: true,
        orderId: dbOrder.id,
        printifyOrderId: printifyResponse.id,
        externalId: printifyOrder.external_id,
        status: dbOrder.status,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Order creation error:', error);
      next(error);
    }
  },

  // Get order by ID (from database)
  getOrder: async (req, res, next) => {
    try {
      const { orderId } = req.params;

      // Try database first
      let order = await Order.findById(orderId);

      if (!order) {
        // Try Printify
        try {
          const printifyOrder = await printifyClient.getOrder(orderId);
          return res.json({
            success: true,
            data: printifyOrder,
            source: 'printify'
          });
        } catch {
          return res.status(404).json({
            success: false,
            error: 'Order not found'
          });
        }
      }

      res.json({
        success: true,
        data: order,
        source: 'database'
      });
    } catch (error) {
      next(error);
    }
  },

  // Get orders by customer email
  getOrdersByEmail: async (req, res, next) => {
    try {
      const { email } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await Order.findByCustomerEmail(email, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  // Calculate shipping cost
  calculateShipping: async (req, res, next) => {
    try {
      const { items, address } = req.body;

      if (!items || !address) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['items', 'address']
        });
      }

      const shippingData = {
        line_items: items.map(item => ({
          product_id: item.productId || item.product_id,
          variant_id: item.variantId || item.variant_id,
          quantity: item.quantity
        })),
        address_to: {
          first_name: address.firstName || address.first_name || 'Customer',
          last_name: address.lastName || address.last_name || 'Name',
          country: address.country,
          region: address.state || address.region,
          address1: address.address1 || '123 Main St',
          city: address.city || 'City',
          zip: address.zip || address.postal_code || '00000'
        }
      };

      const shipping = await printifyClient.calculateShipping(shippingData);

      res.json({
        success: true,
        data: shipping
      });
    } catch (error) {
      console.error('Shipping calculation error:', error);
      next(error);
    }
  },

  // Send order to production
  sendToProduction: async (req, res, next) => {
    try {
      const { orderId } = req.params;

      const result = await printifyClient.sendToProduction(orderId);

      // Update database order status
      await Order.updateByPrintifyId(orderId, { status: 'processing' });

      res.json({
        success: true,
        message: 'Order sent to production',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  // Update order from webhook
  updateFromWebhook: async (printifyOrderId, updates) => {
    return Order.updateByPrintifyId(printifyOrderId, updates);
  }
};

module.exports = ordersController;
