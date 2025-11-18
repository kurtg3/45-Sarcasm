const printifyClient = require('../utils/printifyClient');
const cache = require('../utils/cache');
const fs = require('fs').promises;
const path = require('path');

// Mock products file for testing
const MOCK_PRODUCTS_FILE = path.join(__dirname, '../../data/mock-products.json');

// Read mock products
const readMockProducts = async () => {
  try {
    const data = await fs.readFile(MOCK_PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null; // Return null if file doesn't exist, will fall back to Printify
  }
};

// Helper function to extract category from tags
const extractCategory = (tags) => {
  const categoryMap = {
    'dog': 'dog-lovers',
    'cat': 'cat-lovers',
    'pet': 'pet-lovers',
    'work': 'work-office',
    'office': 'work-office',
    'coffee': 'coffee-lovers',
    'general': 'general-sarcasm'
  };

  for (const tag of tags || []) {
    const lower = tag.toLowerCase();
    if (categoryMap[lower]) return categoryMap[lower];
  }

  return 'general-sarcasm';
};

// Helper function to calculate price from variants
const calculatePrice = (variants) => {
  if (!variants || variants.length === 0) return 0;
  
  // Get the lowest price
  const prices = variants.map(v => v.price / 100); // Convert cents to dollars
  return Math.min(...prices);
};

// Helper to determine if product is featured
const isFeatured = (tags) => {
  return tags?.some(tag => tag.toLowerCase() === 'featured') || false;
};

// Transform Printify product to our format
const transformProduct = (product) => {
  return {
    id: product.id,
    title: product.title,
    description: product.description || '',
    images: product.images || [],
    variants: product.variants || [],
    tags: product.tags || [],
    price: calculatePrice(product.variants),
    category: extractCategory(product.tags),
    featured: isFeatured(product.tags),
    visible: product.visible || true,
    createdAt: product.created_at
  };
};

const productsController = {
  // GET all products
  getAllProducts: async (req, res, next) => {
    try {
      // Check cache first
      const cached = cache.getProducts();
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true
        });
      }

      let products = [];

      // Try to load mock products first (for testing)
      const mockProducts = await readMockProducts();
      
      if (mockProducts && mockProducts.length > 0) {
        // Use mock products for testing
        products = mockProducts;
      } else {
        // Fall back to Printify
        try {
          const response = await printifyClient.getProducts();
          products = (response.data || response)
            .filter(p => p.visible !== false)
            .map(transformProduct);
        } catch (printifyError) {
          // If Printify fails and we have no mock data, throw error
          throw printifyError;
        }
      }

      // Cache for 1 hour
      cache.setProducts(products, 3600);

      res.json({
        success: true,
        data: products,
        cached: false,
        count: products.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET single product by ID
  getProductById: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check cache first
      const cached = cache.getProduct(id);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true
        });
      }

      let product = null;

      // Try to find in mock products first
      const mockProducts = await readMockProducts();
      if (mockProducts) {
        product = mockProducts.find(p => p.id === id);
      }

      // If not found in mock, try Printify
      if (!product) {
        try {
          const printifyProduct = await printifyClient.getProduct(id);
          product = transformProduct(printifyProduct);
        } catch (printifyError) {
          if (printifyError.response?.status === 404) {
            return res.status(404).json({
              success: false,
              error: 'Product not found'
            });
          }
          throw printifyError;
        }
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Cache for 1 hour
      cache.setProduct(id, product, 3600);

      res.json({
        success: true,
        data: product,
        cached: false
      });
    } catch (error) {
      next(error);
    }
  },

  // GET products by category
  getProductsByCategory: async (req, res, next) => {
    try {
      const { category } = req.params;

      // Get all products (from cache or API)
      const cached = cache.getProducts();
      let products;

      if (cached) {
        products = cached;
      } else {
        // Try mock products first
        const mockProducts = await readMockProducts();
        
        if (mockProducts && mockProducts.length > 0) {
          products = mockProducts;
        } else {
          const response = await printifyClient.getProducts();
          products = (response.data || response).map(transformProduct);
        }
        
        cache.setProducts(products, 3600);
      }

      // Filter by category
      const filtered = products.filter(p => p.category === category);

      res.json({
        success: true,
        data: filtered,
        category,
        count: filtered.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Search products
  searchProducts: async (req, res, next) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query required'
        });
      }

      // Get all products
      const cached = cache.getProducts();
      let products;

      if (cached) {
        products = cached;
      } else {
        // Try mock products first
        const mockProducts = await readMockProducts();
        
        if (mockProducts && mockProducts.length > 0) {
          products = mockProducts;
        } else {
          const response = await printifyClient.getProducts();
          products = (response.data || response).map(transformProduct);
        }
        
        cache.setProducts(products, 3600);
      }

      // Search in title, description, and tags
      const query = q.toLowerCase();
      const results = products.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );

      res.json({
        success: true,
        data: results,
        query: q,
        count: results.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Invalidate cache (for admin use)
  invalidateCache: async (req, res) => {
    cache.invalidateProducts();
    res.json({
      success: true,
      message: 'Product cache cleared'
    });
  }
};

module.exports = productsController;
