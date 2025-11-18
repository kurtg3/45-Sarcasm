# Deployment Guide for Sarcasm Mugs

This guide covers deploying your Sarcasm Mugs e-commerce website to your VPS using Dokploy.

## Prerequisites

✅ VPS with Docker installed
✅ Dokploy installed on your VPS
✅ Domain name (sarcasmmugs.com) pointed to your VPS
✅ Printify account with API credentials
✅ Git repository (GitHub, GitLab, etc.)

## Step 1: Prepare Your Repository

1. Initialize git and push to your repository:

```bash
git init
git add .
git commit -m "Initial commit: Sarcasm Mugs e-commerce site"
git remote add origin your-repo-url
git push -u origin main
```

## Step 2: Get Printify API Credentials

1. Log in to [Printify](https://printify.com)
2. Go to **Settings** → **API**
3. Click **Generate API Token**
4. Copy your API token
5. Note your Shop ID from the URL: `shops/YOUR_SHOP_ID`

## Step 3: Configure Dokploy

### 3.1 Create New Application

1. Log in to Dokploy dashboard
2. Click **Create Application**
3. Choose **Git Repository**
4. Connect your repository
5. Select branch: `main`

### 3.2 Build Configuration

- **Build Method**: Dockerfile
- **Dockerfile Path**: `./Dockerfile`
- **Port**: `3000`

### 3.3 Environment Variables

Add these environment variables in Dokploy:

```env
PRINTIFY_API_TOKEN=your_printify_token_here
PRINTIFY_SHOP_ID=your_shop_id_here
BLOG_API_KEY=generate_a_secure_random_key
PORT=3000
NODE_ENV=production
```

Optional (for payments):
```env
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_PUBLIC_KEY=pk_live_your_public_key
```

### 3.4 Domain Configuration

1. Add domain: `sarcasmmugs.com`
2. Add www subdomain: `www.sarcasmmugs.com`
3. Enable SSL/TLS (Let's Encrypt)
4. Force HTTPS redirect

### 3.5 Health Check

Configure health check:
- **Path**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds

## Step 4: Deploy

1. Click **Deploy** in Dokploy
2. Monitor build logs
3. Wait for deployment to complete (2-5 minutes)
4. Access your site at `https://sarcasmmugs.com`

## Step 5: Configure Printify Webhook

1. In Printify dashboard, go to **Settings** → **Webhooks**
2. Add webhook URL: `https://sarcasmmugs.com/api/webhooks/printify`
3. Select events:
   - Order created
   - Order sent to production
   - Shipment created
   - Shipment delivered

## Step 6: Set Up n8n for Blog Automation

### Install n8n (if not already installed)

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

### Create Blog Posting Workflow

1. Access n8n at `http://your-vps:5678`
2. Create new workflow
3. Add **Schedule Trigger** node (daily/weekly)
4. Add **HTTP Request** node:
   - **Method**: POST
   - **URL**: `https://sarcasmmugs.com/api/blog/posts`
   - **Authentication**: Header Auth
   - **Header Name**: X-API-Key
   - **Header Value**: Your BLOG_API_KEY
   - **Body**:
   ```json
   {
     "title": "{{your_title}}",
     "content": "{{your_html_content}}",
     "excerpt": "{{your_excerpt}}",
     "category": "general",
     "tags": ["funny mugs", "sarcasm"]
   }
   ```
5. Activate workflow

## Step 7: Testing

### Test API Endpoints

```bash
# Health check
curl https://sarcasmmugs.com/api/health

# Get products
curl https://sarcasmmugs.com/api/products

# Create blog post (with your API key)
curl -X POST https://sarcasmmugs.com/api/blog/posts \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "content": "<p>Test content</p>",
    "excerpt": "Test excerpt"
  }'
```

### Test Order Flow

1. Visit your website
2. Add product to cart
3. Go to checkout
4. Test order creation (in logs)

## Step 8: Monitoring

### View Logs in Dokploy

1. Go to your application in Dokploy
2. Click **Logs** tab
3. Monitor for errors

### Check Application Status

```bash
# SSH to your VPS
ssh user@your-vps

# Check container status
docker ps | grep sarcasm-mugs

# View logs
docker logs sarcasm-mugs -f
```

## Troubleshooting

### Products Not Loading

**Issue**: Empty product list
**Solution**: 
1. Check Printify API credentials
2. Verify shop ID is correct
3. Check logs: `docker logs sarcasm-mugs`

### Orders Not Creating

**Issue**: Order creation fails
**Solution**:
1. Verify Printify API token has write permissions
2. Check shipping address format
3. Review Printify dashboard for error messages

### Blog Posts Not Creating

**Issue**: n8n posts not appearing
**Solution**:
1. Verify BLOG_API_KEY matches in .env and n8n
2. Check n8n execution logs
3. Test endpoint manually with curl

### SSL Certificate Issues

**Issue**: HTTPS not working
**Solution**:
1. Verify DNS points to your VPS
2. Check Dokploy SSL configuration
3. Force certificate renewal in Dokploy

## Performance Optimization

### Enable Caching

Products are cached for 1 hour by default. To clear cache:

```bash
curl -X POST https://sarcasmmugs.com/api/products/cache/invalidate
```

### CDN Setup (Optional)

1. Sign up for Cloudflare (free tier)
2. Add your domain
3. Update nameservers
4. Enable caching for static assets

### Database Backup (Blog Posts)

```bash
# Backup blog posts
docker exec sarcasm-mugs cat /app/data/blog-posts.json > blog-backup.json

# Restore
docker cp blog-backup.json sarcasm-mugs:/app/data/blog-posts.json
```

## Scaling

### Horizontal Scaling

In Dokploy:
1. Increase replica count to 2-3 instances
2. Enable load balancing
3. All instances share same Printify data

### Vertical Scaling

Increase container resources:
- Memory: 512MB → 1GB
- CPU: 0.5 → 1.0 core

## Security Checklist

✅ HTTPS enabled with valid certificate
✅ Environment variables secured
✅ API keys not exposed in frontend
✅ Rate limiting enabled (100 req/min)
✅ CORS properly configured
✅ Input validation on all endpoints
✅ Regular security updates: `docker pull node:18-alpine`

## Maintenance

### Update Application

```bash
git add .
git commit -m "Update: description"
git push origin main
```

Dokploy will auto-deploy on git push (if configured).

### Manual Deployment

In Dokploy dashboard:
1. Go to your application
2. Click **Redeploy**
3. Wait for completion

### Monitor Performance

Check these regularly:
- Response times
- Error rates in logs
- Product cache hit rate
- Order success rate

## Support Resources

- **Dokploy Docs**: https://dokploy.com/docs
- **Printify API**: https://developers.printify.com
- **n8n Docs**: https://docs.n8n.io
- **Docker Docs**: https://docs.docker.com

## Next Steps

After successful deployment:

1. ✅ Add products in Printify
2. ✅ Test complete order flow
3. ✅ Set up n8n blog automation
4. ✅ Submit sitemap to Google Search Console
5. ✅ Set up Google Analytics
6. ✅ Configure email notifications
7. ✅ Test webhook integrations
8. ✅ Create promotional content
9. ✅ Launch marketing campaigns

---

**Congratulations! Your Sarcasm Mugs store is now live! 🎉☕😏**
