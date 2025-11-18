const fs = require('fs').promises;
const path = require('path');

// Blog posts storage file
const BLOG_FILE = path.join(__dirname, '../../data/blog-posts.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  const dir = path.dirname(BLOG_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Read blog posts
const readPosts = async () => {
  try {
    await ensureDataDir();
    const data = await fs.readFile(BLOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

// Write blog posts
const writePosts = async (posts) => {
  await ensureDataDir();
  await fs.writeFile(BLOG_FILE, JSON.stringify(posts, null, 2));
};

// Generate slug from title
const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const blogController = {
  // GET all blog posts
  getAllPosts: async (req, res, next) => {
    try {
      const posts = await readPosts();
      const { page = 1, limit = 10, category } = req.query;

      let filteredPosts = posts;

      // Filter by category if provided
      if (category) {
        filteredPosts = posts.filter(p => p.category === category);
      }

      // Sort by published date (newest first)
      filteredPosts.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredPosts.length,
          totalPages: Math.ceil(filteredPosts.length / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET single post by ID or slug
  getPost: async (req, res, next) => {
    try {
      const { identifier } = req.params;
      const posts = await readPosts();

      const post = posts.find(p => 
        p.id === identifier || p.slug === identifier
      );

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

  // POST create new blog post (for n8n)
  createPost: async (req, res, next) => {
    try {
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

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'Title and content are required'
        });
      }

      const posts = await readPosts();

      // Create new post
      const newPost = {
        id: generateId(),
        slug: slugify(title),
        title,
        content,
        excerpt: excerpt || content.substring(0, 160) + '...',
        featured_image: featured_image || '',
        category: category || 'general',
        tags: tags || [],
        meta_title: meta_title || title,
        meta_description: meta_description || excerpt || '',
        author: author || 'Sarcasm Mugs Team',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      posts.push(newPost);
      await writePosts(posts);

      res.status(201).json({
        success: true,
        data: newPost,
        message: 'Blog post created successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT update blog post
  updatePost: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const posts = await readPosts();
      const postIndex = posts.findIndex(p => p.id === id);

      if (postIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      // Update post
      const updatedPost = {
        ...posts[postIndex],
        ...updates,
        id: posts[postIndex].id, // Preserve ID
        published_at: posts[postIndex].published_at, // Preserve published date
        updated_at: new Date().toISOString(),
        slug: updates.title ? slugify(updates.title) : posts[postIndex].slug
      };

      posts[postIndex] = updatedPost;
      await writePosts(posts);

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

      const posts = await readPosts();
      const filteredPosts = posts.filter(p => p.id !== id);

      if (filteredPosts.length === posts.length) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      await writePosts(filteredPosts);

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
      const posts = await readPosts();
      const categories = [...new Set(posts.map(p => p.category))];

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
