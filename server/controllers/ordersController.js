const printifyClient = require('../utils/printifyClient');

// Generate unique order ID
const generateOrderId = () => {
  return `SM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const ordersController = {
  // Create new order
  createOrder: async (req, res, next) => {
    try {
      const { items, shipping, customer, paymentConfirmed } = req.body;

      // Validate required fields
      if (!items || !shipping || !customer) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['items', 'shipping', 'customer']
        });
      }

      // Format order for Printify
      const printifyOrder = {
        external_id: generateOrderId(),
        label: customer.email,
        line_items: items.map(item => ({
          product_id: item.productId || item.product_id,
          variant_id: item.variantId || item.variant_id,
          quantity: item.quantity
        })),
        shipping_method: 1, // Standard shipping
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
      const order = await printifyClient.createOrder(printifyOrder);

      // If payment confirmed, send to production immediately
      if (paymentConfirmed) {
        try {
          await printifyClient.sendToProduction(order.id);
        } catch (productionError) {
          console.error('Error sending to production:', productionError);
          // Continue even if production send fails - can be done manually
        }
      }

      res.status(201).json({
        success: true,
        orderId: order.id,
        externalId: printifyOrder.external_id,
        status: order.status,
        message: 'Order created successfully'
      });
    } catch (error) {
      console.error('Order creation error:', error);
      next(error);
    }
  },

  // Get order by ID
  getOrder: async (req, res, next) => {
    try {
      const { orderId } = req.params;

      const order = await printifyClient.getOrder(orderId);

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
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

      res.json({
        success: true,
        message: 'Order sent to production',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = ordersController;
