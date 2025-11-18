require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimit } = require('./middleware/auth');

// Import routes
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const blogRoutes = require('./routes/blog');
const sitemapRoutes = require('./routes/sitemap');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - important for rate limiting and security when behind reverse proxy (nginx, dokploy)
app.set('trust proxy', 1);

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://js.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.printify.com", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression middleware for better performance
app.use(compression());

// CORS configuration - restrict to your domain in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API endpoints
app.use('/api/', rateLimit(100, 60000)); // 100 requests per minute

// Serve static files with caching
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Cache images, fonts, CSS for 1 year
    if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Cache JS files for 1 day
    else if (filePath.match(/\.js$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
};

app.use(express.static(path.join(__dirname, '../'), staticOptions));
app.use('/assets', express.static(path.join(__dirname, '../assets'), staticOptions));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/blog', blogRoutes);

// Sitemap routes
app.use('/', sitemapRoutes);

// Webhook endpoint for Printify
app.post('/api/webhooks/printify', express.json(), (req, res) => {
  const { type, resource } = req.body;

  console.log('📦 Printify Webhook received:', type);

  switch (type) {
    case 'order:created':
      console.log('Order created:', resource.id);
      break;
    
    case 'order:sent-to-production':
      console.log('Order sent to production:', resource.id);
      // You can send customer notification here
      break;
    
    case 'order:shipment:created':
      console.log('Shipment created:', resource.id);
      const tracking = resource.shipments?.[0]?.tracking_number;
      console.log('Tracking number:', tracking);
      // Send tracking email to customer
      break;
    
    case 'order:shipment:delivered':
      console.log('Order delivered:', resource.id);
      // Send delivery confirmation
      break;
    
    default:
      console.log('Unhandled webhook type:', type);
  }

  res.status(200).json({ received: true });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/shop', (req, res) => {
  res.sendFile(path.join(__dirname, '../shop.html'));
});

app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../product.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../checkout.html'));
});

app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, '../blog/index.html'));
});

app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../blog/post.html'));
});

// Shop category pages
app.get('/shop/category/:category', (req, res) => {
  res.sendFile(path.join(__dirname, '../category.html'));
});

// Essential pages
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../contact.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../terms.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '../faq.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║           🎭 SARCASM MUGS API SERVER 🎭              ║
║                                                       ║
║   Server running on: http://localhost:${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'development'.padEnd(36)}║
║                                                       ║
║   API Endpoints:                                      ║
║   • GET  /api/health                                  ║
║   • GET  /api/products                                ║
║   • GET  /api/products/:id                            ║
║   • POST /api/orders                                  ║
║   • POST /api/shipping/calculate                      ║
║   • GET  /api/blog/posts                              ║
║   • POST /api/blog/posts (n8n)                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Check Printify configuration
  if (!process.env.PRINTIFY_API_TOKEN || !process.env.PRINTIFY_SHOP_ID) {
    console.warn(`
⚠️  WARNING: Printify credentials not configured!
Please set the following in your .env file:
  - PRINTIFY_API_TOKEN
  - PRINTIFY_SHOP_ID
    `);
  } else {
    console.log('✅ Printify API configured');
  }

  if (!process.env.BLOG_API_KEY) {
    console.warn('⚠️  WARNING: BLOG_API_KEY not set for n8n integration');
  } else {
    console.log('✅ Blog API configured for n8n');
  }
});

module.exports = app;
