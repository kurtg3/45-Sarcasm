const express = require('express');
const router = express.Router();
const CartSession = require('../models/CartSession');

// Get or create cart session
router.get('/', async (req, res, next) => {
  try {
    let sessionId = req.headers['x-cart-session'] || req.query.session_id;

    if (!sessionId) {
      sessionId = CartSession.generateSessionId();
    }

    const cart = await CartSession.getOrCreate(sessionId);

    res.json({
      success: true,
      data: {
        session_id: cart.session_id,
        items: cart.items || [],
        item_count: (cart.items || []).reduce((sum, item) => sum + item.quantity, 0),
        expires_at: cart.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Add item to cart
router.post('/items', async (req, res, next) => {
  try {
    let sessionId = req.headers['x-cart-session'];
    const { productId, variantId, title, variant, price, image, quantity } = req.body;

    if (!sessionId) {
      sessionId = CartSession.generateSessionId();
    }

    if (!productId || !title || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'productId, title, and price are required'
      });
    }

    const cart = await CartSession.addItem(sessionId, {
      productId,
      variantId,
      title,
      variant,
      price,
      image,
      quantity: quantity || 1
    });

    res.json({
      success: true,
      data: {
        session_id: cart.session_id,
        items: cart.items,
        item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update item quantity
router.put('/items/:productId', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-cart-session'];
    const { productId } = req.params;
    const { variantId, quantity } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Cart session ID required in X-Cart-Session header'
      });
    }

    const cart = await CartSession.updateQuantity(sessionId, productId, variantId, quantity);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    res.json({
      success: true,
      data: {
        session_id: cart.session_id,
        items: cart.items,
        item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Remove item from cart
router.delete('/items/:productId', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-cart-session'];
    const { productId } = req.params;
    const { variantId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Cart session ID required in X-Cart-Session header'
      });
    }

    const cart = await CartSession.removeItem(sessionId, productId, variantId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found'
      });
    }

    res.json({
      success: true,
      data: {
        session_id: cart.session_id,
        items: cart.items,
        item_count: cart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Clear cart
router.delete('/', async (req, res, next) => {
  try {
    const sessionId = req.headers['x-cart-session'];

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Cart session ID required in X-Cart-Session header'
      });
    }

    await CartSession.clear(sessionId);

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    next(error);
  }
});

// Sync cart (merge localStorage cart with server cart)
router.post('/sync', async (req, res, next) => {
  try {
    let sessionId = req.headers['x-cart-session'];
    const { items } = req.body;

    if (!sessionId) {
      sessionId = CartSession.generateSessionId();
    }

    // Get or create cart
    const cart = await CartSession.getOrCreate(sessionId);
    const existingItems = cart.items || [];

    // Merge items from client
    if (items && Array.isArray(items)) {
      for (const clientItem of items) {
        const existingIndex = existingItems.findIndex(
          i => i.productId === clientItem.productId && i.variantId === clientItem.variantId
        );
        if (existingIndex > -1) {
          // Keep the higher quantity
          existingItems[existingIndex].quantity = Math.max(
            existingItems[existingIndex].quantity,
            clientItem.quantity
          );
        } else {
          existingItems.push(clientItem);
        }
      }
    }

    const updatedCart = await CartSession.updateItems(sessionId, existingItems);

    res.json({
      success: true,
      data: {
        session_id: updatedCart.session_id,
        items: updatedCart.items,
        item_count: updatedCart.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
