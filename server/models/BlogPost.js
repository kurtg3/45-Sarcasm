const { pool } = require('../config/database');

// Generate slug from title
const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const BlogPost = {
  // Get all posts with pagination
  async findAll({ page = 1, limit = 10, category = null, isPublished = true } = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT * FROM blog_posts
      WHERE is_published = $1
    `;
    const params = [isPublished];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM blog_posts WHERE is_published = $1';
    const countParams = [isPublished];
    if (category) {
      countQuery += ' AND category = $2';
      countParams.push(category);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      posts: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Find by ID or slug
  async findByIdOrSlug(identifier) {
    const result = await pool.query(
      'SELECT * FROM blog_posts WHERE id::text = $1 OR slug = $1',
      [identifier]
    );
    return result.rows[0] || null;
  },

  // Create a new post
  async create({ title, content, excerpt, featured_image, category, tags, meta_title, meta_description, author }) {
    const slug = slugify(title);
    const autoExcerpt = excerpt || (content ? content.substring(0, 160) + '...' : '');

    const result = await pool.query(
      `INSERT INTO blog_posts
       (slug, title, content, excerpt, featured_image, category, tags, meta_title, meta_description, author)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        slug,
        title,
        content,
        autoExcerpt,
        featured_image || '',
        category || 'general',
        JSON.stringify(tags || []),
        meta_title || title,
        meta_description || autoExcerpt,
        author || 'Sarcasm Mugs Team'
      ]
    );
    return result.rows[0];
  },

  // Update a post
  async update(id, updates) {
    const allowedFields = ['title', 'content', 'excerpt', 'featured_image', 'category', 'tags', 'meta_title', 'meta_description', 'author', 'is_published'];
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = $${paramIndex}`);
        values.push(key === 'tags' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    // Update slug if title changed
    if (updates.title) {
      setFields.push(`slug = $${paramIndex}`);
      values.push(slugify(updates.title));
      paramIndex++;
    }

    if (setFields.length === 0) {
      return this.findByIdOrSlug(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE blog_posts SET ${setFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  // Delete a post
  async delete(id) {
    const result = await pool.query(
      'DELETE FROM blog_posts WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rowCount > 0;
  },

  // Get all categories
  async getCategories() {
    const result = await pool.query(
      'SELECT DISTINCT category FROM blog_posts WHERE is_published = true ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }
};

module.exports = BlogPost;
