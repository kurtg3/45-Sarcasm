const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticateAPIKey } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/posts', blogController.getAllPosts);
router.get('/posts/:identifier', blogController.getPost);
router.get('/categories', blogController.getCategories);

// Protected routes (require API key for n8n)
router.post('/posts', authenticateAPIKey, blogController.createPost);
router.put('/posts/:id', authenticateAPIKey, blogController.updatePost);
router.delete('/posts/:id', authenticateAPIKey, blogController.deletePost);

module.exports = router;
