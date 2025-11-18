const express = require('express');
const router = express.Router();
const printifyClient = require('../utils/printifyClient');

// Generate dynamic sitemap for products
router.get('/sitemap-products.xml', async (req, res) => {
  try {
    const products = await printifyClient.getProducts();
    const baseUrl = process.env.FRONTEND_URL || 'https://sarcasmmugs.com';
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    if (products && products.data) {
      products.data.forEach(product => {
        xml += `
    <url>
        <loc>${baseUrl}/product/${product.id}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>`;

        // Add product images
        if (product.images && product.images.length > 0) {
          product.images.forEach(image => {
            xml += `
        <image:image>
            <image:loc>${image.src}</image:loc>
            <image:title>${product.title}</image:title>
        </image:image>`;
          });
        }

        xml += `
    </url>`;
      });
    }

    xml += `
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating product sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Generate dynamic sitemap for blog posts
router.get('/sitemap-blog.xml', async (req, res) => {
  try {
    const NodeCache = require('node-cache');
    const cache = new NodeCache();
    const posts = cache.get('blog_posts') || [];
    const baseUrl = process.env.FRONTEND_URL || 'https://sarcasmmugs.com';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    posts.forEach(post => {
      const publishDate = post.published_at ? new Date(post.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      xml += `
    <url>
        <loc>${baseUrl}/blog/${post.slug}</loc>
        <lastmod>${publishDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>`;

      // Add featured image
      if (post.featured_image) {
        xml += `
        <image:image>
            <image:loc>${post.featured_image}</image:loc>
            <image:title>${post.title}</image:title>
        </image:image>`;
      }

      xml += `
    </url>`;
    });

    xml += `
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
