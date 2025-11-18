// Shopping Cart Management

// Get cart from localStorage
function getCart() {
    const cart = localStorage.getItem('sarcasm_mugs_cart');
    return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('sarcasm_mugs_cart', JSON.stringify(cart));
    updateCartCount();
}

// Add item to cart
function addToCart(item) {
    const cart = getCart();
    
    // Check if item already exists
    const existingIndex = cart.findIndex(
        i => i.productId === item.productId && i.variantId === item.variantId
    );
    
    if (existingIndex > -1) {
        // Increase quantity
        cart[existingIndex].quantity += item.quantity || 1;
    } else {
        // Add new item
        cart.push({
            ...item,
            quantity: item.quantity || 1
        });
    }
    
    saveCart(cart);
    showNotification('Added to cart!', 'success');
    return cart;
}

// Remove item from cart
function removeFromCart(productId, variantId) {
    let cart = getCart();
    cart = cart.filter(item => !(item.productId === productId && item.variantId === variantId));
    saveCart(cart);
    return cart;
}

// Update item quantity
function updateCartItemQuantity(productId, variantId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.productId === productId && i.variantId === variantId);
    
    if (item) {
        if (quantity <= 0) {
            return removeFromCart(productId, variantId);
        }
        item.quantity = parseInt(quantity);
        saveCart(cart);
    }
    
    return cart;
}

// Clear cart
function clearCart() {
    localStorage.removeItem('sarcasm_mugs_cart');
    updateCartCount();
}

// Get cart total
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
}

// Get cart item count
function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
}

// Update cart count badge
function updateCartCount() {
    const countElement = document.getElementById('cartCount');
    if (countElement) {
        const count = getCartItemCount();
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Render cart page
function renderCartPage() {
    const cart = getCart();
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="text-6xl mb-4">🛒</div>
                <h2 class="text-2xl font-bold mb-4">Your cart is empty</h2>
                <p class="text-gray-600 mb-8">Time to add some sarcastic mugs!</p>
                <a href="/shop" class="inline-block bg-brand-orange text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                    Start Shopping
                </a>
            </div>
        `;
        if (cartSummary) cartSummary.classList.add('hidden');
        return;
    }
    
    // Render cart items
    cartItems.innerHTML = cart.map(item => `
        <div class="bg-white rounded-lg shadow-md p-6 flex items-center gap-4" data-product-id="${item.productId}" data-variant-id="${item.variantId}">
            <img src="${item.image}" alt="${item.title}" class="w-24 h-24 object-cover rounded">
            <div class="flex-1">
                <h3 class="font-semibold text-lg mb-2">${item.title}</h3>
                <p class="text-gray-600 mb-2">$${item.price.toFixed(2)}</p>
                <div class="flex items-center gap-2">
                    <button class="decrease-qty px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" data-product-id="${item.productId}" data-variant-id="${item.variantId}">-</button>
                    <input type="number" value="${item.quantity}" min="1" class="w-16 text-center border rounded px-2 py-1 quantity-input" data-product-id="${item.productId}" data-variant-id="${item.variantId}">
                    <button class="increase-qty px-3 py-1 bg-gray-200 rounded hover:bg-gray-300" data-product-id="${item.productId}" data-variant-id="${item.variantId}">+</button>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xl font-bold mb-4">$${(item.price * item.quantity).toFixed(2)}</p>
                <button class="remove-item text-red-500 hover:text-red-700" data-product-id="${item.productId}" data-variant-id="${item.variantId}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // Render cart summary
    if (cartSummary) {
        const subtotal = getCartTotal();
        const shipping = subtotal > 50 ? 0 : 5.99;
        const total = subtotal + shipping;
        
        cartSummary.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold mb-6">Order Summary</h2>
                <div class="space-y-3 mb-6">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Subtotal</span>
                        <span class="font-semibold">$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Shipping</span>
                        <span class="font-semibold">${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
                    </div>
                    ${subtotal < 50 ? '<p class="text-sm text-gray-500">Add $' + (50 - subtotal).toFixed(2) + ' more for free shipping!</p>' : ''}
                    <div class="border-t pt-3 flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>
                <a href="/checkout" class="block w-full bg-brand-orange text-white text-center px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                    Proceed to Checkout
                </a>
                <a href="/shop" class="block w-full text-center mt-4 text-gray-600 hover:text-brand-orange transition-colors">
                    Continue Shopping
                </a>
            </div>
        `;
    }
    
    // Attach event listeners
    attachCartEventListeners();
}

// Attach event listeners for cart page
function attachCartEventListeners() {
    // Remove item buttons
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = btn.dataset.productId;
            const variantId = btn.dataset.variantId;
            removeFromCart(productId, variantId);
            renderCartPage();
        });
    });
    
    // Increase quantity
    document.querySelectorAll('.increase-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = btn.dataset.productId;
            const variantId = btn.dataset.variantId;
            const input = document.querySelector(`.quantity-input[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
            const newQty = parseInt(input.value) + 1;
            updateCartItemQuantity(productId, variantId, newQty);
            renderCartPage();
        });
    });
    
    // Decrease quantity
    document.querySelectorAll('.decrease-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = btn.dataset.productId;
            const variantId = btn.dataset.variantId;
            const input = document.querySelector(`.quantity-input[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
            const newQty = Math.max(1, parseInt(input.value) - 1);
            updateCartItemQuantity(productId, variantId, newQty);
            renderCartPage();
        });
    });
    
    // Manual quantity input
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const productId = input.dataset.productId;
            const variantId = input.dataset.variantId;
            const newQty = Math.max(1, parseInt(e.target.value) || 1);
            updateCartItemQuantity(productId, variantId, newQty);
            renderCartPage();
        });
    });
}

// Initialize cart page if on cart page
if (window.location.pathname === '/cart' || window.location.pathname === '/cart.html') {
    document.addEventListener('DOMContentLoaded', renderCartPage);
}
