const BlogPost = require('../models/BlogPost');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');

// Sanitize HTML content to prevent XSS
const sanitizeContent = (content) => {
  return sanitizeHtml(content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'iframe']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
      a: ['href', 'target', 'rel'],
      '*': ['class', 'id', 'style']
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com']
  });
};

// Validation rules for blog posts
const blogValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 500 }),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('excerpt').optional().trim().isLength({ max: 500 }),
  body('category').optional().trim().isLength({ max: 100 }),
  body('meta_title').optional().trim().isLength({ max: 500 }),
  body('meta_description').optional().trim().isLength({ max: 500 }),
  body('author').optional().trim().isLength({ max: 255 })
];

const blogController = {
  // Validation middleware
  validation: blogValidation,

  // GET all blog posts
  getAllPosts: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, category } = req.query;

      const result = await BlogPost.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        category: category || null
      });

      res.json({
        success: true,
        data: result.posts,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  // GET single post by ID or slug
  getPost: async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const post = await BlogPost.findByIdOrSlug(identifier);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      next(error);
    }
  },

  // POST create new blog post (for n8n or admin)
  createPost: async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        title,
        content,
        excerpt,
        featured_image,
        category,
        tags,
        meta_title,
        meta_description,
        author
      } = req.body;

      // Sanitize HTML content
      const sanitizedContent = sanitizeContent(content);

      const newPost = await BlogPost.create({
        title: title.trim(),
        content: sanitizedContent,
        excerpt: excerpt ? excerpt.trim() : null,
        featured_image,
        category: category ? category.trim() : null,
        tags: tags || [],
        meta_title: meta_title ? meta_title.trim() : null,
        meta_description: meta_description ? meta_description.trim() : null,
        author: author ? author.trim() : null
      });

      res.status(201).json({
        success: true,
        data: newPost,
        message: 'Blog post created successfully'
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'A post with this title already exists'
        });
      }
      next(error);
    }
  },

  // PUT update blog post
  updatePost: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      // Sanitize content if being updated
      if (updates.content) {
        updates.content = sanitizeContent(updates.content);
      }

      const updatedPost = await BlogPost.update(id, updates);

      if (!updatedPost) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      res.json({
        success: true,
        data: updatedPost,
        message: 'Blog post updated successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE blog post
  deletePost: async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await BlogPost.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      res.json({
        success: true,
        message: 'Blog post deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET categories
  getCategories: async (req, res, next) => {
    try {
      const categories = await BlogPost.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = blogController;
