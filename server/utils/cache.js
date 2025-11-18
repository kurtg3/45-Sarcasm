const NodeCache = require('node-cache');

// Create cache instance with 1 hour TTL
const cache = new NodeCache({ 
  stdTTL: 3600,
  checkperiod: 600 
});

// Helper functions
const cacheHelpers = {
  get: (key) => {
    return cache.get(key);
  },

  set: (key, value, ttl = 3600) => {
    return cache.set(key, value, ttl);
  },

  del: (key) => {
    return cache.del(key);
  },

  flush: () => {
    return cache.flushAll();
  },

  has: (key) => {
    return cache.has(key);
  },

  // Product-specific helpers
  getProducts: () => {
    return cache.get('products');
  },

  setProducts: (products, ttl = 3600) => {
    return cache.set('products', products, ttl);
  },

  invalidateProducts: () => {
    return cache.del('products');
  },

  getProduct: (productId) => {
    return cache.get(`product_${productId}`);
  },

  setProduct: (productId, product, ttl = 3600) => {
    return cache.set(`product_${productId}`, product, ttl);
  }
};

module.exports = cacheHelpers;
