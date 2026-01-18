const { pool } = require('../config/database');

const Order = {
  // Create a new order
  async create({
    printify_order_id,
    customer_email,
    customer_name,
    shipping_address,
    billing_address,
    items,
    subtotal,
    shipping_cost,
    tax,
    total,
    payment_intent_id,
    notes
  }) {
    const result = await pool.query(
      `INSERT INTO orders
       (printify_order_id, customer_email, customer_name, shipping_address, billing_address,
        items, subtotal, shipping_cost, tax, total, payment_intent_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        printify_order_id,
        customer_email,
        customer_name,
        JSON.stringify(shipping_address),
        billing_address ? JSON.stringify(billing_address) : null,
        JSON.stringify(items),
        subtotal,
        shipping_cost || 0,
        tax || 0,
        total,
        payment_intent_id,
        notes
      ]
    );
    return result.rows[0];
  },

  // Find order by ID
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  // Find order by Printify order ID
  async findByPrintifyId(printifyOrderId) {
    const result = await pool.query(
      'SELECT * FROM orders WHERE printify_order_id = $1',
      [printifyOrderId]
    );
    return result.rows[0] || null;
  },

  // Find orders by customer email
  async findByCustomerEmail(email, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM orders
       WHERE customer_email = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [email, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM orders WHERE customer_email = $1',
      [email]
    );
    const total = parseInt(countResult.rows[0].count);

    return {
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Update order status
  async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] || null;
  },

  // Update payment status
  async updatePaymentStatus(id, paymentStatus, paymentIntentId = null) {
    const result = await pool.query(
      `UPDATE orders SET payment_status = $1, payment_intent_id = COALESCE($2, payment_intent_id)
       WHERE id = $3 RETURNING *`,
      [paymentStatus, paymentIntentId, id]
    );
    return result.rows[0] || null;
  },

  // Update tracking info
  async updateTracking(id, trackingNumber, trackingUrl = null) {
    const result = await pool.query(
      `UPDATE orders SET tracking_number = $1, tracking_url = $2, status = 'shipped'
       WHERE id = $3 RETURNING *`,
      [trackingNumber, trackingUrl, id]
    );
    return result.rows[0] || null;
  },

  // Update by Printify order ID (for webhooks)
  async updateByPrintifyId(printifyOrderId, updates) {
    const allowedFields = ['status', 'payment_status', 'tracking_number', 'tracking_url'];
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setFields.length === 0) {
      return this.findByPrintifyId(printifyOrderId);
    }

    values.push(printifyOrderId);
    const result = await pool.query(
      `UPDATE orders SET ${setFields.join(', ')} WHERE printify_order_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  // Get all orders (admin)
  async findAll({ page = 1, limit = 20, status = null } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM orders';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM orders';
    const countParams = [];
    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      orders: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};

module.exports = Order;
