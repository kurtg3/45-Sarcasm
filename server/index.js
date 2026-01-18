require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');

// Import database
const { initializeDatabase, cleanupExpiredCarts } = require('./config/database');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimit } = require('./middleware/auth');

// Import routes
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const blogRoutes = require('./routes/blog');
const cartRoutes = require('./routes/cart');
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
app.use('/api/cart', cartRoutes);

// Sitemap routes
app.use('/', sitemapRoutes);

// Stripe webhook endpoint (with signature verification)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('./models/Order');

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Update order payment status
        if (paymentIntent.metadata?.orderId) {
          await Order.updatePaymentStatus(paymentIntent.metadata.orderId, 'paid', paymentIntent.id);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        if (failedPayment.metadata?.orderId) {
          await Order.updatePaymentStatus(failedPayment.metadata.orderId, 'failed', failedPayment.id);
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout completed:', session.id);
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
  }

  res.json({ received: true });
});

// Printify webhook endpoint
app.post('/api/webhooks/printify', express.json(), async (req, res) => {
  const { type, resource } = req.body;

  console.log('Printify Webhook received:', type);

  try {
    switch (type) {
      case 'order:created':
        console.log('Order created:', resource.id);
        break;

      case 'order:sent-to-production':
        console.log('Order sent to production:', resource.id);
        await Order.updateByPrintifyId(resource.id, { status: 'processing' });
        break;

      case 'order:shipment:created':
        console.log('Shipment created:', resource.id);
        const tracking = resource.shipments?.[0]?.tracking_number;
        const trackingUrl = resource.shipments?.[0]?.tracking_url;
        if (tracking) {
          await Order.updateByPrintifyId(resource.id, {
            status: 'shipped',
            tracking_number: tracking,
            tracking_url: trackingUrl
          });
        }
        break;

      case 'order:shipment:delivered':
        console.log('Order delivered:', resource.id);
        await Order.updateByPrintifyId(resource.id, { status: 'delivered' });
        break;

      default:
        console.log('Unhandled webhook type:', type);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
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

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize PostgreSQL database
    if (process.env.DATABASE_URL) {
      await initializeDatabase();
      console.log('PostgreSQL database initialized');

      // Clean up expired cart sessions every hour
      setInterval(cleanupExpiredCarts, 60 * 60 * 1000);
    } else {
      console.warn('WARNING: DATABASE_URL not set - running without PostgreSQL');
    }

    app.listen(PORT, () => {
      console.log(`
=======================================================
           SARCASM MUGS API SERVER
=======================================================
   Server running on: http://localhost:${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}

   API Endpoints:
   - GET  /api/health
   - GET  /api/products
   - GET  /api/products/:id
   - POST /api/orders
   - GET  /api/orders/:orderId
   - GET  /api/orders/customer/:email
   - POST /api/shipping/calculate
   - GET  /api/blog/posts
   - POST /api/blog/posts (n8n)
   - GET  /api/cart
   - POST /api/cart/items
   - POST /api/cart/sync
=======================================================
      `);

      // Check configuration
      if (!process.env.PRINTIFY_API_TOKEN || !process.env.PRINTIFY_SHOP_ID) {
        console.warn('WARNING: Printify credentials not configured');
      } else {
        console.log('Printify API configured');
      }

      if (!process.env.BLOG_API_KEY) {
        console.warn('WARNING: BLOG_API_KEY not set for n8n integration');
      } else {
        console.log('Blog API configured for n8n');
      }

      if (!process.env.DATABASE_URL) {
        console.warn('WARNING: DATABASE_URL not set');
      } else {
        console.log('PostgreSQL database connected');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
