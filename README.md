# Sarcasm Mugs E-Commerce Website

A modern, SEO-optimized e-commerce website for selling sarcastic mugs with Printify print-on-demand integration.

## 🎭 Features

- **Print-on-Demand Integration**: Seamless Printify API integration for product management and order fulfillment
- **Modern UI**: Built with Tailwind CSS for a beautiful, responsive design
- **Product Catalog**: Dynamic product loading with categories, search, and filtering
- **Shopping Cart**: Persistent cart with localStorage
- **Blog System**: RESTful API with n8n automation support
- **SEO Optimized**: Meta tags, structured data, and semantic HTML
- **Fast & Lightweight**: Vanilla JavaScript, no heavy frameworks
- **Easy Deployment**: Docker-ready for deployment with Dokploy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Printify account with API credentials
- (Optional) Stripe account for payments
- (Optional) n8n for blog automation

### Installation

1. **Clone or download the project**

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
# Printify API (Required)
PRINTIFY_API_TOKEN=your_printify_api_token_here
PRINTIFY_SHOP_ID=your_shop_id_here

# Stripe Payment (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Blog API Key for n8n (Required for blog automation)
BLOG_API_KEY=your_secure_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=production
```

4. **Build Tailwind CSS**
```bash
npm run build:css
```

5. **Start the server**
```bash
npm start
```

The website will be available at `http://localhost:3000`

## 📁 Project Structure

```
sarcasm-mugs/
├── server/                 # Backend API
│   ├── controllers/        # Request handlers
│   ├── routes/            # API routes
│   ├── middleware/        # Auth & error handling
│   ├── utils/             # Printify client & cache
│   └── index.js           # Express server
├── assets/                # Frontend assets
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript files
├── blog/                  # Blog pages
├── data/                  # Blog posts storage (auto-created)
├── *.html                 # HTML pages
├── package.json
├── Dockerfile
└── README.md
```

## 🔌 API Endpoints

### Products API

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/search?q=query` - Search products

### Orders API

- `POST /api/orders` - Create new order
- `GET /api/orders/:orderId` - Get order status
- `POST /api/orders/shipping/calculate` - Calculate shipping cost

### Blog API (n8n Integration)

**Public Endpoints:**
- `GET /api/blog/posts` - Get all blog posts
- `GET /api/blog/posts/:id` - Get single post
- `GET /api/blog/categories` - Get all categories

**Protected Endpoints (require X-API-Key header):**
- `POST /api/blog/posts` - Create new post
- `PUT /api/blog/posts/:id` - Update post
- `DELETE /api/blog/posts/:id` - Delete post

## 🔐 Getting Printify Credentials

1. Go to [Printify](https://printify.com) and create an account
2. Create a shop in Printify
3. Go to **Settings** → **API**
4. Generate a new API token
5. Copy your Shop ID from the URL (e.g., `shops/123456`)
6. Add credentials to `.env` file

## 📝 Blog Integration with n8n

### Creating Posts via n8n

**Endpoint:** `POST /api/blog/posts`

**Headers:**
```
X-API-Key: your_blog_api_key_from_env
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "10 Hilarious Dog Lover Mugs",
  "content": "<p>Your full HTML content here...</p>",
  "excerpt": "Short description...",
  "featured_image": "https://example.com/image.jpg",
  "category": "dog-mugs",
  "tags": ["funny mugs", "dog lover gifts"],
  "meta_title": "SEO title",
  "meta_description": "SEO description",
  "author": "Sarcasm Mugs Team"
}
```

### n8n Workflow Example

1. **Trigger**: Schedule (daily/weekly)
2. **HTTP Request**: POST to `/api/blog/posts`
3. **Authentication**: Add X-API-Key header
4. **Body**: Generate blog content using AI or templates

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t sarcasm-mugs .
```

### Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e PRINTIFY_API_TOKEN=your_token \
  -e PRINTIFY_SHOP_ID=your_shop_id \
  -e BLOG_API_KEY=your_api_key \
  --name sarcasm-mugs \
  sarcasm-mugs
```

### Deploy with Dokploy

1. Push code to Git repository
2. In Dokploy dashboard, create new application
3. Select "Dockerfile" as build method
4. Add environment variables:
   - `PRINTIFY_API_TOKEN`
   - `PRINTIFY_SHOP_ID`
   - `BLOG_API_KEY`
   - `STRIPE_SECRET_KEY` (optional)
5. Set domain: `sarcasmmugs.com`
6. Deploy!

## 🎨 Customization

### Adding Products

Products are managed in Printify. To add new products:

1. Create designs in Printify
2. Add products to your shop
3. Tag products for categorization:
   - `featured` - Shows on homepage
   - `dog`, `cat`, `pet` - Pet lovers category
   - `work`, `office` - Work & office category
   - `coffee` - Coffee lovers category

### Styling

- Edit `assets/css/input.css` for custom styles
- Modify colors in `tailwind.config.js`
- Rebuild CSS: `npm run build:css`

### SEO Optimization

- Update meta tags in HTML files
- Add structured data (JSON-LD) in product pages
- Generate sitemap.xml
- Submit to Google Search Console

## 📊 Product Categories

The system automatically categorizes products based on Printify tags:

- **Dog Lovers** (`dog`, `dogs`)
- **Cat Lovers** (`cat`, `cats`)
- **Pet Lovers** (`pet`, `pets`)
- **Work & Office** (`work`, `office`)
- **Coffee Lovers** (`coffee`)
- **General Sarcasm** (default)

## 🛒 Order Flow

1. Customer adds products to cart (stored in localStorage)
2. Proceeds to checkout
3. Shipping address collected
4. Shipping cost calculated via Printify API
5. Payment processed (Stripe integration)
6. Order created in Printify
7. Order automatically sent to production
8. Printify handles printing and shipping
9. Webhooks update order status
10. Customer receives tracking information

## 📦 Printify Webhooks

Configure webhook URL in Printify: `https://sarcasmmugs.com/api/webhooks/printify`

Supported events:
- `order:created` - Order created
- `order:sent-to-production` - Order in production
- `order:shipment:created` - Shipment created with tracking
- `order:shipment:delivered` - Order delivered

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Build CSS
npm run build:css

# Start production server
npm start
```

## 🚨 Troubleshooting

### Products not loading
- Check Printify API credentials in `.env`
- Verify shop ID is correct
- Check browser console for errors
- Clear cache: `POST /api/products/cache/invalidate`

### Orders failing
- Verify shipping address format
- Check product variants are valid
- Review Printify order creation errors in server logs

### Blog posts not creating
- Verify `BLOG_API_KEY` matches in n8n
- Check `X-API-Key` header is included
- Ensure JSON format is correct

## 📈 Performance Tips

1. **Caching**: Products are cached for 1 hour
2. **Image Optimization**: Use Printify's image CDN
3. **Lazy Loading**: Images load on scroll
4. **Minification**: CSS is minified in production
5. **CDN**: Serve static assets via CDN

## 🔒 Security

- API key authentication for blog endpoints
- Rate limiting on all API routes (100 req/min)
- CORS enabled for frontend
- Environment variables for secrets
- Input validation on all endpoints

## 📧 Support

For issues or questions:
- Check server logs for errors
- Review Printify API documentation
- Test API endpoints with Postman
- Check browser console for frontend errors

## 📄 License

MIT License - feel free to use for your projects!

## 🎉 Credits

Built with:
- Express.js
- Tailwind CSS
- Printify API
- Node.js
- Vanilla JavaScript

---

**Made with ☕ and 😏 by the Sarcasm Mugs Team**
