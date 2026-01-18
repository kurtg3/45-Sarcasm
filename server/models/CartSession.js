const { pool } = require('../config/database');
const crypto = require('crypto');

const CartSession = {
  // Generate a unique session ID
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  },

  // Get or create cart session
  async getOrCreate(sessionId) {
    // Try to find existing session
    let result = await pool.query(
      'SELECT * FROM cart_sessions WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP',
      [sessionId]
    );

    if (result.rows[0]) {
      return result.rows[0];
    }

    // Create new session
    result = await pool.query(
      `INSERT INTO cart_sessions (session_id, items, expires_at)
       VALUES ($1, '[]'::jsonb, CURRENT_TIMESTAMP + INTERVAL '30 days')
       RETURNING *`,
      [sessionId]
    );
    return result.rows[0];
  },

  // Get cart by session ID
  async findBySessionId(sessionId) {
    const result = await pool.query(
      'SELECT * FROM cart_sessions WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP',
      [sessionId]
    );
    return result.rows[0] || null;
  },

  // Update cart items
  async updateItems(sessionId, items) {
    const result = await pool.query(
      `UPDATE cart_sessions
       SET items = $1, expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
       WHERE session_id = $2
       RETURNING *`,
      [JSON.stringify(items), sessionId]
    );
    return result.rows[0] || null;
  },

  // Add item to cart
  async addItem(sessionId, item) {
    const cart = await this.getOrCreate(sessionId);
    const items = cart.items || [];

    // Check if item already exists (by product ID and variant ID)
    const existingIndex = items.findIndex(
      i => i.productId === item.productId && i.variantId === item.variantId
    );

    if (existingIndex > -1) {
      // Update quantity
      items[existingIndex].quantity += item.quantity || 1;
    } else {
      // Add new item
      items.push({
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        variant: item.variant,
        price: item.price,
        image: item.image,
        quantity: item.quantity || 1,
        addedAt: new Date().toISOString()
      });
    }

    return this.updateItems(sessionId, items);
  },

  // Remove item from cart
  async removeItem(sessionId, productId, variantId) {
    const cart = await this.findBySessionId(sessionId);
    if (!cart) return null;

    const items = (cart.items || []).filter(
      i => !(i.productId === productId && i.variantId === variantId)
    );

    return this.updateItems(sessionId, items);
  },

  // Update item quantity
  async updateQuantity(sessionId, productId, variantId, quantity) {
    const cart = await this.findBySessionId(sessionId);
    if (!cart) return null;

    const items = cart.items || [];
    const itemIndex = items.findIndex(
      i => i.productId === productId && i.variantId === variantId
    );

    if (itemIndex === -1) return cart;

    if (quantity <= 0) {
      items.splice(itemIndex, 1);
    } else {
      items[itemIndex].quantity = quantity;
    }

    return this.updateItems(sessionId, items);
  },

  // Clear cart
  async clear(sessionId) {
    return this.updateItems(sessionId, []);
  },

  // Associate cart with customer email
  async associateCustomer(sessionId, customerEmail) {
    const result = await pool.query(
      'UPDATE cart_sessions SET customer_email = $1 WHERE session_id = $2 RETURNING *',
      [customerEmail, sessionId]
    );
    return result.rows[0] || null;
  },

  // Merge anonymous cart with customer cart (when user logs in)
  async mergeCart(anonymousSessionId, customerEmail) {
    // Get anonymous cart
    const anonymousCart = await this.findBySessionId(anonymousSessionId);
    if (!anonymousCart || !anonymousCart.items.length) {
      return null;
    }

    // Find existing customer cart
    const customerCart = await pool.query(
      'SELECT * FROM cart_sessions WHERE customer_email = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY updated_at DESC LIMIT 1',
      [customerEmail]
    );

    if (customerCart.rows[0]) {
      // Merge items
      const existingItems = customerCart.rows[0].items || [];
      const newItems = anonymousCart.items || [];

      for (const newItem of newItems) {
        const existingIndex = existingItems.findIndex(
          i => i.productId === newItem.productId && i.variantId === newItem.variantId
        );
        if (existingIndex > -1) {
          existingItems[existingIndex].quantity += newItem.quantity;
        } else {
          existingItems.push(newItem);
        }
      }

      await this.updateItems(customerCart.rows[0].session_id, existingItems);
      // Delete anonymous cart
      await pool.query('DELETE FROM cart_sessions WHERE session_id = $1', [anonymousSessionId]);
      return this.findBySessionId(customerCart.rows[0].session_id);
    }

    // Just associate the anonymous cart with customer
    return this.associateCustomer(anonymousSessionId, customerEmail);
  },

  // Delete cart session
  async delete(sessionId) {
    const result = await pool.query(
      'DELETE FROM cart_sessions WHERE session_id = $1 RETURNING *',
      [sessionId]
    );
    return result.rowCount > 0;
  }
};

module.exports = CartSession;
