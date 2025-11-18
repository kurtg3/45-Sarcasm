// Products page JavaScript
const API_URL = window.location.origin;
let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initializeFilters();
    updateCartCount();
});

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();
        
        if (data.success) {
            allProducts = data.data;
            filteredProducts = allProducts;
            
            // Check for category from URL
            const params = new URLSearchParams(window.location.search);
            const category = params.get('category');
            if (category) {
                currentCategory = category;
                const radio = document.querySelector(`input[value="${category}"]`);
                if (radio) radio.checked = true;
                filterProducts();
            } else {
                renderProducts();
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="col-span-full text-center py-12"><p class="text-red-500">Failed to load products</p></div>';
    }
}

function initializeFilters() {
    // Category filters
    document.querySelectorAll('input[name="category"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            filterProducts();
        });
    });
    
    // Sort
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        sortProducts(e.target.value);
    });
}

function filterProducts() {
    if (currentCategory === 'all') {
        filteredProducts = allProducts;
    } else {
        filteredProducts = allProducts.filter(p => p.category === currentCategory);
    }
    renderProducts();
}

function sortProducts(sortBy) {
    switch(sortBy) {
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
            filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        default: // featured
            filteredProducts.sort((a, b) => b.featured - a.featured);
    }
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const countEl = document.getElementById('productCount');
    
    if (countEl) countEl.textContent = filteredProducts.length;
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-600">No products found in this category</p></div>';
        return;
    }
    
    grid.innerHTML = filteredProducts.map(product => {
        const image = product.images[0]?.src || '/assets/images/placeholder.png';
        return `
            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" data-product-id="${product.id}">
                <div class="relative">
                    <img src="${image}" alt="${product.title}" class="w-full h-64 object-cover" loading="lazy">
                    ${product.featured ? '<span class="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 text-xs font-bold rounded">FEATURED</span>' : ''}
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-2">${product.title}</h3>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${product.description || ''}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-2xl font-bold text-brand-orange">$${product.price.toFixed(2)}</span>
                        <button class="add-to-cart bg-brand-charcoal text-white px-4 py-2 rounded-lg hover:bg-gray-800" data-product-id="${product.id}">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Attach listeners
    document.querySelectorAll('[data-product-id]').forEach(el => {
        el.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-to-cart')) {
                window.location.href = `/product/${el.dataset.productId}`;
            }
        });
    });
    
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const productId = btn.dataset.productId;
            const product = filteredProducts.find(p => p.id === productId);
            
            if (product && product.variants[0]) {
                addToCart({
                    productId: product.id,
                    variantId: product.variants[0].id,
                    title: product.title,
                    price: product.variants[0].price / 100,
                    image: product.images[0]?.src || '',
                    quantity: 1
                });
                
                btn.textContent = '✓ Added!';
                btn.classList.add('bg-green-600');
                setTimeout(() => {
                    btn.textContent = 'Add to Cart';
                    btn.classList.remove('bg-green-600');
                }, 2000);
            }
        });
    });
}
