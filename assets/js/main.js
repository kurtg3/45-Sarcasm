// Main JavaScript for Sarcasm Mugs

// API Base URL
const API_URL = window.location.origin;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeSearch();
    updateCartCount();
    
    // Load featured products on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadFeaturedProducts();
        loadBlogCardsHome();
    }
});

// Navigation
function initializeNavigation() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// Search functionality
function initializeSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const closeSearch = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchBtn || !searchOverlay) return;
    
    searchBtn.addEventListener('click', () => {
        searchOverlay.classList.remove('hidden');
        searchInput.focus();
    });
    
    closeSearch.addEventListener('click', () => {
        searchOverlay.classList.add('hidden');
        searchInput.value = '';
        searchResults.innerHTML = '';
    });
    
    // Search on input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchProducts(query);
        }, 300);
    });
}

// Search products
async function searchProducts(query) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '<p class="text-gray-500 text-center py-4">Searching...</p>';
    
    try {
        const response = await fetch(`${API_URL}/api/products/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            searchResults.innerHTML = data.data.map(product => `
                <a href="/product/${product.id}" class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <img src="${product.images[0]?.src || '/assets/images/placeholder.png'}" alt="${product.title}" class="w-16 h-16 object-cover rounded">
                    <div class="ml-4 flex-1">
                        <h4 class="font-semibold">${product.title}</h4>
                        <p class="text-sm text-gray-600">$${product.price.toFixed(2)}</p>
                    </div>
                </a>
            `).join('');
        } else {
            searchResults.innerHTML = '<p class="text-gray-500 text-center py-4">No products found</p>';
        }
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<p class="text-red-500 text-center py-4">Search failed. Please try again.</p>';
    }
}

// Load featured products
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();
        
        if (data.success) {
            // Filter featured products or get first 8
            const featured = data.data.filter(p => p.featured).slice(0, 8);
            const products = featured.length > 0 ? featured : data.data.slice(0, 8);
            
            if (products.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-600">No products available yet. Check back soon!</p></div>';
                return;
            }
            
            container.innerHTML = products.map(product => renderProductCard(product)).join('');
            attachProductCardListeners();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-500">Failed to load products. Please refresh the page.</p></div>';
    }
}

// Render product card
function renderProductCard(product) {
    const image = product.images && product.images.length > 0 ? product.images[0].src : '/assets/images/placeholder.png';
    const featuredBadge = product.featured ? '<span class="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 text-xs font-bold rounded">FEATURED</span>' : '';
    
    return `
        <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer" data-product-id="${product.id}">
            <div class="relative">
                <img src="${image}" alt="${product.title}" class="w-full h-64 object-cover" loading="lazy">
                ${featuredBadge}
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-lg mb-2 line-clamp-2">${product.title}</h3>
                <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description || ''}</p>
                <div class="flex items-center justify-between">
                    <span class="text-2xl font-bold text-brand-orange">$${product.price.toFixed(2)}</span>
                    <button class="add-to-cart-btn bg-brand-charcoal text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors" data-product-id="${product.id}">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Attach listeners to product cards
function attachProductCardListeners() {
    // Click on card to view product
    document.querySelectorAll('[data-product-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking the add to cart button
            if (e.target.classList.contains('add-to-cart-btn') || e.target.closest('.add-to-cart-btn')) {
                return;
            }
            const productId = card.dataset.productId;
            window.location.href = `/product/${productId}`;
        });
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = btn.dataset.productId;
            await quickAddToCart(productId, btn);
        });
    });
}

// Quick add to cart (without going to product page)
async function quickAddToCart(productId, button) {
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    button.disabled = true;
    
    try {
        // Fetch product details
        const response = await fetch(`${API_URL}/api/products/${productId}`);
        const data = await response.json();
        
        if (data.success && data.data.variants && data.data.variants.length > 0) {
            // Add first variant to cart
            const variant = data.data.variants[0];
            const cartItem = {
                productId: data.data.id,
                variantId: variant.id,
                title: data.data.title,
                price: variant.price / 100, // Convert cents to dollars
                image: data.data.images[0]?.src || '',
                quantity: 1
            };
            
            addToCart(cartItem);
            
            // Success feedback
            button.textContent = '✓ Added!';
            button.classList.add('bg-green-600');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('bg-green-600');
                button.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        button.textContent = 'Error';
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 2000);
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } animate-slideDown`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Format price
function formatPrice(price) {
    return `$${parseFloat(price).toFixed(2)}`;
}

// Load blog cards for homepage
async function loadBlogCardsHome() {
    const container = document.getElementById('blogCardsHome');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/api/blog/posts?limit=6`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            container.innerHTML = data.data.map(post => `
                <article class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    ${post.featured_image ? `
                        <a href="/blog/${post.slug}">
                            <img src="${post.featured_image}" alt="${post.title}" class="w-full h-48 object-cover">
                        </a>
                    ` : ''}
                    <div class="p-6">
                        <h3 class="text-xl font-bold mb-2 line-clamp-2">
                            <a href="/blog/${post.slug}" class="hover:text-brand-orange transition-colors">${post.title}</a>
                        </h3>
                        <p class="text-gray-600 mb-4 line-clamp-3">${post.excerpt}</p>
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-500">${new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <a href="/blog/${post.slug}" class="text-brand-orange font-semibold hover:underline">Read More →</a>
                        </div>
                    </div>
                </article>
            `).join('');
        } else {
            container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-600">No blog posts yet. Check back soon!</p></div>';
        }
    } catch (error) {
        console.error('Error loading blog posts:', error);
        container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-red-500">Failed to load blog posts.</p></div>';
    }
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
