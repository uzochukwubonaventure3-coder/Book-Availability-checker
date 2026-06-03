// ==================== CONFIGURATION ====================
const CONFIG = {
    API_BASE_URL: (() => {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:5000/api';
        }
        return '/api';
    })(),
    
    PAYSTACK_PUBLIC_KEY: 'pk_test_your_public_key_here', // Replace with your actual key
    
    VAT_RATE: 0.075, // 7.5%
    
    DEFAULT_PAGE_SIZE: 12,
    
    CART_STORAGE_KEY: 'cart',
    WISHLIST_STORAGE_KEY: 'wishlist',
    TOKEN_STORAGE_KEY: 'token',
    THEME_STORAGE_KEY: 'darkMode',
    VIEW_MODE_KEY: 'viewMode',
    PAGE_SIZE_KEY: 'pageSize'
};

// ==================== UTILITY FUNCTIONS ====================
const Utils = {
    // Get auth token
    getToken: () => localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY),
    
    // Check if user is authenticated
    isAuthenticated: () => !!localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY),
    
    // Redirect to login if not authenticated
    requireAuth: () => {
        if (!Utils.isAuthenticated()) {
            window.location.href = '../Student-dahbord/login.html';
            return false;
        }
        return true;
    },
    
    // Get user info from token
    getUserInfo: () => {
        const token = Utils.getToken();
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.id,
                email: payload.email,
                name: payload.name || payload.username,
                role: payload.role
            };
        } catch (e) {
            return null;
        }
    },
    
    // Format price
    formatPrice: (price) => {
        return Number(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    // Format date
    formatDate: (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'N/A';
        }
    },
    
    // Format date only
    formatDateOnly: (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    },
    
    // Format time only
    formatTime: (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'N/A';
        }
    },
    
    // Sanitize input
    sanitize: (str) => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/g, '')
            .replace(/on\w+='[^']*'/g, '')
            .replace(/javascript:/gi, '')
            .replace(/data:/gi, '');
    },
    
    // Escape HTML
    escapeHtml: (text) => {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Validate ID
    isValidId: (id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[a-f0-9]{24}$/i.test(id) || /^[a-zA-Z0-9_-]+$/.test(id);
    },
    
    // Show notification
    showNotification: (message, type = 'info') => {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 4000);

        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            });
        }
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Make API request
    apiRequest: async (endpoint, options = {}) => {
        const token = Utils.getToken();
        const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (response.status === 401 || response.status === 403) {
                Utils.showNotification('Session expired. Please login again.', 'error');
                setTimeout(() => {
                    localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
                    window.location.href = '../Student-dahbord/login.html';
                }, 2000);
                return null;
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            Utils.showNotification('Network error. Please try again.', 'error');
            return null;
        }
    }
};

// ==================== THEME MANAGEMENT ====================
const ThemeManager = {
    init: () => {
        const isDark = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) === 'true';
        ThemeManager.applyTheme(isDark);
        
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', ThemeManager.toggle);
        }
    },
    
    toggle: () => {
        const isDark = !document.body.classList.contains('dark-mode');
        ThemeManager.applyTheme(isDark);
        localStorage.setItem(CONFIG.THEME_STORAGE_KEY, isDark);
    },
    
    applyTheme: (isDark) => {
        const body = document.body;
        const themeBtn = document.getElementById('themeToggle');
        
        if (isDark) {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            if (themeBtn) {
                const icon = themeBtn.querySelector('i');
                const span = themeBtn.querySelector('span');
                if (icon) icon.className = 'fas fa-sun';
                if (span) span.textContent = 'Light Mode';
            }
        } else {
            body.classList.add('light-mode');
            body.classList.remove('dark-mode');
            if (themeBtn) {
                const icon = themeBtn.querySelector('i');
                const span = themeBtn.querySelector('span');
                if (icon) icon.className = 'fas fa-moon';
                if (span) span.textContent = 'Dark Mode';
            }
        }
    }
};

// ==================== CART MANAGEMENT ====================
// ==================== CART MANAGEMENT ====================
const CartManager = {
    getCart: () => {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.CART_STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    },
    
    saveCart: (cart) => {
        localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(cart));
        CartManager.updateCartCount();
    },
    
    addItem: async (itemType, itemId, quantity = 1) => {
        // For mock data or when backend is unavailable, skip validation
        const isMockItem = itemId.startsWith('demo-') || itemId.startsWith('basic-') || itemId.startsWith('premium-') || itemId.startsWith('ca-only-');
        
        if (isMockItem) {
            // Handle mock items directly
            return CartManager.addMockItem(itemType, itemId, quantity);
        }
        
        // Try backend validation for real items
        try {
            const response = await Utils.apiRequest('/cart/add', {
                method: 'POST',
                body: JSON.stringify({ itemType, itemId, quantity })
            });
            
            if (response && response.success) {
                return CartManager.addToLocalCart(itemType, itemId, quantity, response.data);
            }
            
            // If backend fails but it's a valid item in our mock data, add it anyway
            if (itemType === 'book') {
                const book = allBooks.find(b => b.id === itemId);
                if (book) {
                    return CartManager.addMockItem(itemType, itemId, quantity);
                }
            }
            
            Utils.showNotification(response?.message || 'Failed to add to cart', 'error');
            return false;
        } catch (error) {
            // If backend is unavailable but item exists in mock data, add it
            if (itemType === 'book') {
                const book = allBooks.find(b => b.id === itemId);
                if (book) {
                    return CartManager.addMockItem(itemType, itemId, quantity);
                }
            }
            Utils.showNotification('Network error. Please try again.', 'error');
            return false;
        }
    },
    
    addMockItem: (itemType, itemId, quantity) => {
        let itemData = null;
        
        if (itemType === 'book') {
            const book = allBooks.find(b => b.id === itemId);
            if (book) {
                itemData = {
                    name: book.title,
                    price: book.price
                };
            }
        } else if (itemType === 'package') {
            // For packages, check mock packages
            const mockPackages = [
                { id: 'basic-1', name: 'Basic Package', price: 5000 },
                { id: 'premium-1', name: 'Premium Package', price: 15000 },
                { id: 'ca-only-1', name: 'CA Filling Service', price: 8000 }
            ];
            const pkg = mockPackages.find(p => p.id === itemId);
            if (pkg) {
                itemData = {
                    name: pkg.name,
                    price: pkg.price
                };
            }
        }
        
        if (itemData) {
            return CartManager.addToLocalCart(itemType, itemId, quantity, itemData);
        }
        
        Utils.showNotification('Item not found', 'error');
        return false;
    },
    
    addToLocalCart: (itemType, itemId, quantity, data) => {
        const cart = CartManager.getCart();
        const existingItem = cart.find(item => 
            item.itemId === itemId && item.itemType === itemType
        );
        
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.total = existingItem.price * existingItem.quantity;
        } else {
            cart.push({
                itemType,
                itemId,
                name: data.name,
                price: data.price,
                quantity,
                total: data.price * quantity
            });
        }
        
        CartManager.saveCart(cart);
        Utils.showNotification('Added to cart successfully!', 'success');
        return true;
    },
    
    removeItem: (index) => {
        const cart = CartManager.getCart();
        cart.splice(index, 1);
        CartManager.saveCart(cart);
        return cart;
    },
    
    updateQuantity: (index, change) => {
        const cart = CartManager.getCart();
        const item = cart[index];
        if (!item) return null;
        
        const newQuantity = item.quantity + change;
        if (newQuantity < 1 || newQuantity > 10) return null;
        
        item.quantity = newQuantity;
        item.total = item.price * newQuantity;
        CartManager.saveCart(cart);
        return cart;
    },
    
    setQuantity: (index, quantity) => {
        const cart = CartManager.getCart();
        const item = cart[index];
        if (!item) return null;
        
        const newQuantity = parseInt(quantity);
        if (isNaN(newQuantity) || newQuantity < 1 || newQuantity > 10) return null;
        
        item.quantity = newQuantity;
        item.total = item.price * newQuantity;
        CartManager.saveCart(cart);
        return cart;
    },
    
    clearCart: () => {
        localStorage.removeItem(CONFIG.CART_STORAGE_KEY);
        CartManager.updateCartCount();
    },
    
    getCartCount: () => {
        const cart = CartManager.getCart();
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    updateCartCount: () => {
        const count = CartManager.getCartCount();
        document.querySelectorAll('.cart-count').forEach(el => {
            if (el) el.textContent = count;
        });
    },
    
    getCartTotal: () => {
        const cart = CartManager.getCart();
        return cart.reduce((sum, item) => sum + item.total, 0);
    },
    
    getCartSubtotal: () => {
        return CartManager.getCartTotal();
    },
    
    getCartTax: () => {
        return CartManager.getCartTotal() * CONFIG.VAT_RATE;
    },
    
    getCartGrandTotal: () => {
        return CartManager.getCartTotal() * (1 + CONFIG.VAT_RATE);
    }
};

// Update the displayMockPackages function to fix package cards
function displayMockPackages() {
    const mockPackages = [
        {
            id: 'basic-1',
            name: 'Basic Package',
            description: 'Essential book purchase for your courses',
            price: 5000,
            includesBook: true,
            includesCA: false,
            features: ['Book included', '24/7 support']
        },
        {
            id: 'premium-1',
            name: 'Premium Package',
            description: 'Complete package with book and CA filling service',
            price: 15000,
            includesBook: true,
            includesCA: true,
            features: ['Book included', 'CA filling service', 'Priority support']
        },
        {
            id: 'ca-only-1',
            name: 'CA Filling Service',
            description: 'Professional CA filling service only',
            price: 8000,
            includesBook: false,
            includesCA: true,
            features: ['CA filling service', 'Email notifications']
        }
    ];
    
    displayPackages(mockPackages);
}

// Update the displayPackages function to handle mock data properly
function displayPackages(packages) {
    const container = document.getElementById('packagesGrid');
    if (!container) return;
    
    container.innerHTML = packages.map(pkg => `
        <div class="package-card ${pkg.name?.includes('Premium') ? 'popular' : ''}">
            ${pkg.name?.includes('Premium') ? '<div class="popular-badge">Most Popular</div>' : ''}
            <div class="package-icon">
                <i class="fas fa-${pkg.includesCA ? 'clipboard-check' : 'book'}"></i>
            </div>
            <h3 class="package-name">${Utils.escapeHtml(pkg.name || 'Package')}</h3>
            <div class="package-price">
                ₦${Utils.formatPrice(pkg.price || 0)} <small>one-time</small>
            </div>
            <p class="package-description">${Utils.escapeHtml(pkg.description || '')}</p>
            
            <ul class="package-features">
                <li>
                    <i class="fas ${pkg.includesBook ? 'fa-check' : 'fa-times'}"></i>
                    ${pkg.includesBook ? 'Book included' : 'Book not included'}
                </li>
                <li>
                    <i class="fas ${pkg.includesCA ? 'fa-check' : 'fa-times'}"></i>
                    ${pkg.includesCA ? 'CA filling service' : 'No CA service'}
                </li>
                ${pkg.includesCA ? '<li><i class="fas fa-clock"></i> CA filled within 7 days</li>' : ''}
                <li><i class="fas fa-headset"></i> 24/7 support</li>
            </ul>

            <div class="package-actions">
                <button class="btn btn-primary" onclick="addToCart('${pkg.id}', 'package')">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <button class="btn btn-outline" onclick="viewPackageDetails('${pkg.id}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        </div>
    `).join('');
}

// Update the loadPackages function
async function loadPackages() {
    const container = document.getElementById('packagesGrid');
    if (!container) return;

    try {
        const response = await Utils.apiRequest('/packages');
        
        if (response?.success && response.data && response.data.length > 0) {
            displayPackages(response.data);
        } else {
            // Always show mock packages if backend fails
            displayMockPackages();
        }
    } catch (error) {
        // Show mock packages on error
        displayMockPackages();
    }
}

// Add a quick search function
function quickSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = query;
        window.currentPage = 1;
        BooksManager.applyFilters();
    }
}

// Update the addToCart function to handle both books and packages
async function addToCart(itemId, itemType) {
    // Show loading state
    Utils.showNotification('Adding to cart...', 'info');
    
    const success = await CartManager.addItem(itemType, itemId, 1);
    
    if (success) {
        // Update cart count in navbar
        CartManager.updateCartCount();
    }
}

// Add this function to initialize the packages page when loaded
function initializePackagesPage() {
    console.log('Initializing packages page');
    loadPackages();
}

// Update the initialize function to handle packages page
document.addEventListener("DOMContentLoaded", () => {
    // Check authentication
    if (!Utils.requireAuth()) return;

    // Initialize state
    window.currentPage = 1;
    window.pageSize = parseInt(localStorage.getItem(CONFIG.PAGE_SIZE_KEY)) || CONFIG.DEFAULT_PAGE_SIZE;
    
    // Initialize theme
    ThemeManager.init();
    
    // Update counts
    WishlistManager.updateWishlistCount();
    CartManager.updateCartCount();
    
    // Update user info
    const user = Utils.getUserInfo();
    if (user) {
        document.querySelectorAll('.username').forEach(el => {
            if (el) el.textContent = user.name || 'Student';
        });
        const studentNameEl = document.getElementById('studentName');
        if (studentNameEl) studentNameEl.textContent = user.name || 'Student';
    }
    
    // Initialize navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            navigateToSection(section);
        });
    });
    
    // Initialize components based on current page
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    if (filename === 'index.html' || filename === '') {
        // Dashboard page
        initializeDashboard();
    } else if (filename === 'packages.html') {
        // Packages page
        initializePackagesPage();
    } else if (filename === 'cart.html') {
        // Cart page
        initializeCartPage();
    } else if (filename === 'checkout.html') {
        // Checkout page
        initializeCheckoutPage();
    } else if (filename === 'payment-callback.html') {
        // Payment callback page
        initializePaymentCallback();
    }
    
    // Logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
});

// Add these styles to your style.css if not already present
const additionalStyles = `
.btn-primary {
    background: #22c55e;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn-primary:hover {
    background: #16a34a;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.btn-outline {
    background: transparent;
    border: 2px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn-outline:hover {
    background: var(--bg-secondary);
    transform: translateY(-2px);
}

.loading-spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
`;

// Add styles to document if needed
if (!document.querySelector('#dynamic-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'dynamic-styles';
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);
}

// ==================== WISHLIST MANAGEMENT ====================
const WishlistManager = {
    getWishlist: () => {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.WISHLIST_STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    },
    
    saveWishlist: (wishlist) => {
        localStorage.setItem(CONFIG.WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
        WishlistManager.updateWishlistCount();
    },
    
    toggleItem: (book, button) => {
        const wishlist = WishlistManager.getWishlist();
        const existingIndex = wishlist.findIndex(item => item.id === book.id);
        
        if (existingIndex !== -1) {
            wishlist.splice(existingIndex, 1);
            if (button) {
                button.classList.remove('in-wishlist');
                button.innerHTML = '<i class="far fa-heart"></i> Wishlist';
            }
            Utils.showNotification('Removed from wishlist', 'success');
        } else {
            wishlist.push({
                id: book.id,
                title: Utils.sanitize(book.title),
                author: Utils.sanitize(book.author),
                isbn: Utils.sanitize(book.isbn),
                price: book.price,
                category: book.category,
                addedAt: new Date().toISOString()
            });
            
            if (wishlist.length > 100) {
                wishlist = wishlist.slice(-100);
            }
            
            if (button) {
                button.classList.add('in-wishlist');
                button.innerHTML = '<i class="fas fa-heart"></i> In Wishlist';
            }
            Utils.showNotification('Added to wishlist', 'success');
            
            // Send to backend
            WishlistManager.sendToBackend(book);
        }
        
        WishlistManager.saveWishlist(wishlist);
        return wishlist;
    },
    
    removeItem: (bookId) => {
        let wishlist = WishlistManager.getWishlist();
        wishlist = wishlist.filter(item => item.id !== bookId);
        WishlistManager.saveWishlist(wishlist);
        return wishlist;
    },
    
    updateWishlistCount: () => {
        const count = WishlistManager.getWishlist().length;
        document.querySelectorAll('.wishlist-count').forEach(el => {
            if (el) el.textContent = count;
        });
    },
    
    sendToBackend: async (book) => {
        const token = Utils.getToken();
        if (!token) return;
        
        try {
            await fetch(`${CONFIG.API_BASE_URL}/student/wishlist`, {
                method: 'POST',
                headers: { 
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bookId: book.id,
                    title: book.title,
                    isbn: book.isbn,
                    addedAt: new Date().toISOString()
                })
            });
        } catch (error) {
            // Silent error
        }
    }
};

// ==================== BOOKS MANAGEMENT ====================
let allBooks = [];

const BooksManager = {
    loadBooks: async () => {
        const token = Utils.getToken();
        
        if (!token) {
            window.location.href = "../Student-dahbord/login.html";
            return;
        }

        BooksManager.showLoadingSkeleton();
        
        try {
            const response = await Utils.apiRequest('/student/books');
            
            if (response) {
                if (Array.isArray(response)) {
                    allBooks = response;
                } else if (response && typeof response === 'object') {
                    if (Array.isArray(response.books)) {
                        allBooks = response.books;
                    } else if (Array.isArray(response.data)) {
                        allBooks = response.data;
                    }
                }
                
                allBooks = BooksManager.transformBackendData(allBooks);
                
                if (allBooks.length === 0) {
                    await BooksManager.loadMockBooks();
                } else {
                    Utils.showNotification(`Loaded ${allBooks.length} books`, "success");
                }
            } else {
                await BooksManager.loadMockBooks();
            }
            
            BooksManager.applyFilters();
            
        } catch (error) {
            await BooksManager.loadMockBooks();
        }
    },
    
    transformBackendData: (books) => {
        if (!books || !Array.isArray(books)) return [];
        
        return books.map(book => {
            const sanitizedTitle = Utils.sanitize(book.title || "");
            const sanitizedAuthor = Utils.sanitize(book.author || "");
            const sanitizedCode = Utils.sanitize(book.code || book.isbn || "");
            const sanitizedCategory = Utils.sanitize(book.category || "");
            
            return {
                id: Utils.isValidId(book._id || book.id) ? (book._id || book.id) : "invalid",
                title: sanitizedTitle || "Untitled Book",
                author: sanitizedAuthor || "Unknown Author",
                isbn: sanitizedCode || "N/A",
                category: sanitizedCategory || "general",
                quantity: parseInt(book.stock || book.quantity) || 0,
                price: parseFloat(book.price) || 0,
                createdAt: book.createdAt || new Date().toISOString()
            };
        }).filter(book => book.id !== "invalid");
    },
    
    loadMockBooks: async () => {
        if (allBooks.length > 0) return;
        
        allBooks = [
            {
                id: "demo-1",
                title: "Introduction to Computer Science",
                author: "John Doe",
                isbn: "CSC 101",
                category: "science",
                quantity: 15,
                price: 3500,
                createdAt: "2024-01-15T10:30:00Z"
            },
            {
                id: "demo-2",
                title: "Calculus for Beginners",
                author: "Jane Smith",
                isbn: "MTH 101",
                category: "science",
                quantity: 8,
                price: 4200,
                createdAt: "2024-01-20T14:45:00Z"
            },
            {
                id: "demo-3",
                title: "General Physics",
                author: "Robert Johnson",
                isbn: "PHY 101",
                category: "science",
                quantity: 12,
                price: 3800,
                createdAt: "2024-02-05T09:15:00Z"
            },
            {
                id: "demo-4",
                title: "Organic Chemistry",
                author: "Dr. Michael Chen",
                isbn: "CHM 101",
                category: "science",
                quantity: 10,
                price: 4500,
                createdAt: "2024-02-10T11:20:00Z"
            },
            {
                id: "demo-5",
                title: "Business Management",
                author: "Prof. Sarah Williams",
                isbn: "BUS 201",
                category: "business",
                quantity: 20,
                price: 3200,
                createdAt: "2024-02-15T16:30:00Z"
            },
            {
                id: "demo-6",
                title: "Nigerian History",
                author: "Dr. Adebayo Ojo",
                isbn: "HIS 101",
                category: "arts",
                quantity: 18,
                price: 2800,
                createdAt: "2024-02-18T14:15:00Z"
            }
        ];
        
        await new Promise(resolve => setTimeout(resolve, 300));
    },
    
    showLoadingSkeleton: () => {
        const container = document.getElementById("booksContainer");
        if (!container) return;
        
        const view = localStorage.getItem(CONFIG.VIEW_MODE_KEY) || 'grid';
        const skeletonCount = view === 'grid' ? 12 : 6;
        
        container.innerHTML = `
            <div class="loading-skeleton ${view}-view">
                ${Array(skeletonCount).fill().map(() => `
                    <div class="book-skeleton">
                        <div class="book-cover"></div>
                        <div class="book-info">
                            <div class="line"></div>
                            <div class="line short"></div>
                            <div class="line shorter"></div>
                            <div class="line"></div>
                            <div class="line short"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    applyFilters: () => {
        const searchInput = document.getElementById("searchInput");
        const yearFilter = document.getElementById("yearFilter");
        const categoryFilter = document.getElementById("categoryFilter");
        const sortFilter = document.getElementById("sortFilter");
        const pageSizeSelect = document.getElementById("pageSize");
        
        if (!searchInput || !yearFilter || !categoryFilter || !sortFilter) return;
        
        const query = Utils.sanitize(searchInput.value.trim().toLowerCase());
        const year = yearFilter.value;
        const category = categoryFilter.value;
        const sort = sortFilter.value;
        const pageSize = parseInt(pageSizeSelect?.value || CONFIG.DEFAULT_PAGE_SIZE);
        const currentPage = parseInt(window.currentPage || 1);

        let filtered = [...allBooks];

        // Search filter
        if (query.length > 0) {
            filtered = filtered.filter(book => {
                const isbn = (book.isbn || "").toLowerCase();
                const title = (book.title || "").toLowerCase();
                const author = (book.author || "").toLowerCase();
                
                return isbn.includes(query) || 
                       title.includes(query) || 
                       author.includes(query);
            });
        }

        // Year level filter
        if (year !== "all") {
            filtered = filtered.filter(book => {
                const isbn = book.isbn || "";
                const match = isbn.match(/[A-Za-z]+\s*(\d+)/);
                if (!match) return false;
                const courseNumber = parseInt(match[1]);
                if (isNaN(courseNumber)) return false;
                const level = Math.floor(courseNumber / 100) * 100;
                return level.toString() === year;
            });
        }

        // Category filter
        if (category !== "all") {
            filtered = filtered.filter(book => book.category === category);
        }

        // Sort results
        filtered.sort((a, b) => {
            switch (sort) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'title-asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title-desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'price-low':
                    return (a.price || 0) - (b.price || 0);
                case 'price-high':
                    return (b.price || 0) - (a.price || 0);
                default:
                    return 0;
            }
        });

        // Apply pagination
        const totalBooks = filtered.length;
        const totalPages = Math.ceil(totalBooks / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalBooks);
        const paginatedBooks = filtered.slice(startIndex, endIndex);

        // Update results count
        BooksManager.updateResultsCount(paginatedBooks.length, totalBooks);
        
        // Display books
        BooksManager.displayBooks(paginatedBooks);
        
        // Update pagination
        BooksManager.updatePagination(totalPages);
    },
    
    updateResultsCount: (shown, total) => {
        const resultsCount = document.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${shown} of ${total} books`;
        }
    },
    
    displayBooks: (books) => {
        const container = document.getElementById("booksContainer");
        if (!container) return;
        
        const view = localStorage.getItem(CONFIG.VIEW_MODE_KEY) || 'grid';
        
        if (books.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>No Books Found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                    <button class="clear-filters-btn" onclick="clearFilters()">
                        <i class="fas fa-redo"></i> Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        const wishlist = WishlistManager.getWishlist();

        if (view === 'grid') {
            container.innerHTML = books.map(book => {
                const safeId = Utils.isValidId(book.id) ? Utils.escapeHtml(book.id) : '';
                const isInWishlist = wishlist.some(item => item.id === book.id);
                
                return `
                <div class="book-card">
                    <div class="book-card-header">
                        <span class="book-level">${Utils.escapeHtml(BooksManager.getBookLevel(book.isbn))} Level</span>
                        <span class="book-status ${book.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                            ${book.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </div>
                    
                    <div class="book-cover-placeholder">
                        <i class="fas fa-book"></i>
                    </div>
                    
                    <h3 class="book-title">${Utils.escapeHtml(book.title || "Untitled Book")}</h3>
                    <p class="book-author"><i class="fas fa-user"></i> ${Utils.escapeHtml(book.author || "Unknown Author")}</p>
                    <p class="book-code"><i class="fas fa-barcode"></i> ${Utils.escapeHtml(book.isbn || "N/A")}</p>
                    
                    <div class="book-details">
                        <div class="detail-item">
                            <span class="detail-label">Available:</span>
                            <span class="detail-value quantity ${book.quantity > 0 ? 'available' : 'unavailable'}">
                                ${book.quantity || 0}
                            </span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Price:</span>
                            <span class="detail-value price">₦${Utils.formatPrice(book.price || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="book-actions">
                        <button class="view-btn" onclick="viewBookDetails('${safeId}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}" onclick="toggleWishlist('${safeId}', this)">
                            <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Wishlist'}
                        </button>
                        <button class="add-to-cart-btn" onclick="addToCart('${safeId}', 'book')">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                    
                    <small class="upload-time">
                        <i class="far fa-clock"></i> Added ${Utils.formatDate(book.createdAt)}
                    </small>
                </div>
            `}).join('');
        } else {
            container.innerHTML = books.map(book => {
                const safeId = Utils.isValidId(book.id) ? Utils.escapeHtml(book.id) : '';
                const isInWishlist = wishlist.some(item => item.id === book.id);
                
                return `
                <div class="book-card list-view-card">
                    <div class="book-cover-placeholder">
                        <i class="fas fa-book"></i>
                    </div>
                    
                    <div class="book-info">
                        <div class="book-card-header">
                            <span class="book-level">${Utils.escapeHtml(BooksManager.getBookLevel(book.isbn))} Level</span>
                            <span class="book-status ${book.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                ${book.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                        </div>
                        
                        <h3 class="book-title">${Utils.escapeHtml(book.title || "Untitled Book")}</h3>
                        <p class="book-author"><i class="fas fa-user"></i> ${Utils.escapeHtml(book.author || "Unknown Author")}</p>
                        <p class="book-code"><i class="fas fa-barcode"></i> ${Utils.escapeHtml(book.isbn || "N/A")}</p>
                        
                        <div class="book-details">
                            <div class="detail-item">
                                <span class="detail-label">Available:</span>
                                <span class="detail-value quantity ${book.quantity > 0 ? 'available' : 'unavailable'}">
                                    ${book.quantity || 0}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Price:</span>
                                <span class="detail-value price">₦${Utils.formatPrice(book.price || 0)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Category:</span>
                                <span class="detail-value">${Utils.escapeHtml(BooksManager.getCategoryName(book.category))}</span>
                            </div>
                        </div>
                        
                        <div class="book-actions">
                            <button class="view-btn" onclick="viewBookDetails('${safeId}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}" onclick="toggleWishlist('${safeId}', this)">
                                <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Wishlist'}
                            </button>
                            <button class="add-to-cart-btn" onclick="addToCart('${safeId}', 'book')">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('');
        }
    },
    
    getBookLevel: (isbn) => {
        if (!isbn) return "Unknown";
        const match = isbn.match(/\d+/);
        if (!match) return "Unknown";
        const courseNumber = parseInt(match[0]);
        if (isNaN(courseNumber)) return "Unknown";
        const level = Math.floor(courseNumber / 100) * 100;
        return level > 0 ? level.toString() : "Unknown";
    },
    
    getCategoryName: (category) => {
        const categories = {
            'science': 'Science & Technology',
            'arts': 'Arts & Humanities',
            'business': 'Business & Economics',
            'law': 'Law',
            'medicine': 'Medicine',
            'general': 'General'
        };
        return categories[category] || 'General';
    },
    
    updatePagination: (totalPages) => {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        const currentPage = parseInt(window.currentPage || 1);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" onclick="changePage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
            paginationHTML += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }
};

// ==================== DASHBOARD FUNCTIONS ====================
async function loadCABooking() {
    const container = document.getElementById('caBookingContent');
    if (!container) return;

    const response = await Utils.apiRequest('/student/ca-booking');
    
    if (response?.success && response.data) {
        const booking = response.data;
        const date = new Date(booking.scheduledDate);
        
        container.innerHTML = `
            <div class="ca-date-large">
                ${Utils.formatDateOnly(date)}
            </div>
            <div class="ca-time">
                at ${Utils.formatTime(date)}
            </div>
            <div class="ca-status-badge ${booking.status}">
                <i class="fas fa-${booking.status === 'completed' ? 'check-circle' : 'clock'}"></i>
                ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </div>
            <div class="ca-package-info">
                <i class="fas fa-gift"></i> Package: ${booking.packageId?.name || 'CA Service'}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="ca-date-large" style="font-size: 1.5rem;">
                No Active CA Booking
            </div>
            <p style="margin-top: 1rem;">
                <a href="#" onclick="navigateToSection('packages')" style="color: white; text-decoration: underline;">
                    Purchase a CA package
                </a>
            </p>
        `;
    }
}

async function loadRecentOrders() {
    const container = document.getElementById('recentOrders');
    if (!container) return;

    const response = await Utils.apiRequest('/student/orders');
    
    if (response?.success && response.data.length > 0) {
        const recentOrders = response.data.slice(0, 3);
        
        container.innerHTML = recentOrders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-number">${order.orderNumber}</span>
                    <span class="order-status status-${order.status}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                </div>
                <div class="order-details">
                    <span>₦${Utils.formatPrice(order.totalAmount)}</span>
                    <span>${Utils.formatDate(order.createdAt)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <span class="order-item-tag">${item.quantity}x ${Utils.escapeHtml(item.name)}</span>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <i class="fas fa-shopping-bag"></i>
                <p>No orders yet</p>
                <button onclick="navigateToSection('packages')" class="btn-primary" style="margin-top: 1rem;">
                    Start Shopping
                </button>
            </div>
        `;
    }
}

async function loadCAHistory() {
    const container = document.getElementById('caHistory');
    if (!container) return;

    const response = await Utils.apiRequest('/student/ca-bookings');
    
    if (response?.success && response.data.length > 0) {
        container.innerHTML = response.data.map(booking => {
            const date = new Date(booking.scheduledDate);
            return `
                <div class="ca-history-item">
                    <div class="history-info">
                        <div class="date">
                            ${Utils.formatDateOnly(date)} at ${Utils.formatTime(date)}
                        </div>
                        <div class="package">${booking.packageId?.name || 'CA Service'}</div>
                    </div>
                    <span class="history-badge ${booking.status}">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = '<p class="empty-state">No CA booking history</p>';
    }
}

function loadQuickStats() {
    const container = document.getElementById('quickStats');
    if (!container) return;
    
    const cart = CartManager.getCart();
    const wishlist = WishlistManager.getWishlist();
    
    container.innerHTML = `
        <div class="stat-box">
            <i class="fas fa-shopping-cart" style="color: #22c55e;"></i>
            <div class="stat-value">${CartManager.getCartCount()}</div>
            <div class="stat-label">Items in Cart</div>
        </div>
        <div class="stat-box">
            <i class="fas fa-heart" style="color: #ef4444;"></i>
            <div class="stat-value">${wishlist.length}</div>
            <div class="stat-label">Wishlist Items</div>
        </div>
    `;
}

async function loadPackages() {
    const container = document.getElementById('packagesGrid');
    if (!container) return;

    const response = await Utils.apiRequest('/packages');
    
    if (response?.success && response.data.length > 0) {
        displayPackages(response.data);
    } else {
        displayMockPackages();
    }
}

function displayPackages(packages) {
    const container = document.getElementById('packagesGrid');
    if (!container) return;
    
    container.innerHTML = packages.map(pkg => `
        <div class="package-card ${pkg.name?.includes('Premium') ? 'popular' : ''}">
            ${pkg.name?.includes('Premium') ? '<div class="popular-badge">Most Popular</div>' : ''}
            <div class="package-icon">
                <i class="fas fa-${pkg.includesCA ? 'clipboard-check' : 'book'}"></i>
            </div>
            <h3 class="package-name">${Utils.escapeHtml(pkg.name || 'Package')}</h3>
            <div class="package-price">
                ₦${Utils.formatPrice(pkg.price || 0)} <small>one-time</small>
            </div>
            <p class="package-description">${Utils.escapeHtml(pkg.description || '')}</p>
            
            <ul class="package-features">
                <li>
                    <i class="fas ${pkg.includesBook ? 'fa-check' : 'fa-times'}"></i>
                    ${pkg.includesBook ? 'Book included' : 'Book not included'}
                </li>
                <li>
                    <i class="fas ${pkg.includesCA ? 'fa-check' : 'fa-times'}"></i>
                    ${pkg.includesCA ? 'CA filling service' : 'No CA service'}
                </li>
                ${pkg.includesCA ? '<li><i class="fas fa-clock"></i> CA filled within 7 days</li>' : ''}
                <li><i class="fas fa-headset"></i> 24/7 support</li>
            </ul>

            <div class="package-actions">
                <button class="btn btn-primary" onclick="addToCart('${pkg._id || pkg.id}', 'package')">
                    <i class="fas fa-cart-plus"></i> Add to Cart
                </button>
                <button class="btn btn-outline" onclick="viewPackageDetails('${pkg._id || pkg.id}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        </div>
    `).join('');
}

function displayMockPackages() {
    const mockPackages = [
        {
            id: 'basic-1',
            name: 'Basic Package',
            description: 'Essential book purchase for your courses',
            price: 5000,
            includesBook: true,
            includesCA: false
        },
        {
            id: 'premium-1',
            name: 'Premium Package',
            description: 'Complete package with book and CA filling service',
            price: 15000,
            includesBook: true,
            includesCA: true
        },
        {
            id: 'ca-only-1',
            name: 'CA Filling Service',
            description: 'Professional CA filling service only',
            price: 8000,
            includesBook: false,
            includesCA: true
        }
    ];
    
    displayPackages(mockPackages);
}

async function loadAllOrders() {
    const container = document.getElementById('allOrdersContainer');
    if (!container) return;

    const response = await Utils.apiRequest('/student/orders');
    
    if (response?.success && response.data.length > 0) {
        container.innerHTML = response.data.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-number">${order.orderNumber}</span>
                    <span class="order-status status-${order.status}">
                        ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                </div>
                <div class="order-details">
                    <span>₦${Utils.formatPrice(order.totalAmount)}</span>
                    <span>${Utils.formatDate(order.createdAt)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <span class="order-item-tag">${item.quantity}x ${Utils.escapeHtml(item.name)}</span>
                    `).join('')}
                </div>
                ${order.paymentReference ? `
                    <div class="order-payment" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                        <i class="fas fa-credit-card"></i> Ref: ${order.paymentReference}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <h3>No Orders Yet</h3>
                <p>Start shopping to see your orders here</p>
                <button onclick="navigateToSection('packages')" class="btn-primary">
                    Browse Packages
                </button>
            </div>
        `;
    }
}

function loadWishlist() {
    const container = document.getElementById('wishlistContainer');
    if (!container) return;
    
    const wishlist = WishlistManager.getWishlist();
    const view = localStorage.getItem(CONFIG.VIEW_MODE_KEY) || 'grid';
    
    if (wishlist.length === 0) {
        container.innerHTML = `
            <div class="empty-wishlist">
                <i class="fas fa-heart"></i>
                <h3>Your wishlist is empty</h3>
                <p>Start adding books to your wishlist!</p>
                <button class="browse-btn" onclick="navigateToSection('books')">
                    <i class="fas fa-book"></i> Browse Books
                </button>
            </div>
        `;
        return;
    }
    
    if (view === 'grid') {
        container.innerHTML = `
            <div class="wishlist-grid">
                ${wishlist.map(item => `
                    <div class="wishlist-item">
                        <div class="wishlist-cover">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="wishlist-info">
                            <h4>${Utils.escapeHtml(item.title)}</h4>
                            <p><i class="fas fa-user"></i> ${Utils.escapeHtml(item.author)}</p>
                            <p><i class="fas fa-barcode"></i> ${Utils.escapeHtml(item.isbn)}</p>
                            <p class="wishlist-price">₦${Utils.formatPrice(item.price)}</p>
                            <div class="wishlist-actions">
                                <button class="view-btn" onclick="viewBookDetails('${item.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="remove-btn" onclick="removeFromWishlist('${item.id}')">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                                <button class="add-to-cart-btn" onclick="addToCart('${item.id}', 'book')">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="wishlist-list">
                ${wishlist.map(item => `
                    <div class="wishlist-list-item">
                        <div class="wishlist-cover">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="wishlist-info">
                            <h4>${Utils.escapeHtml(item.title)}</h4>
                            <p><i class="fas fa-user"></i> ${Utils.escapeHtml(item.author)}</p>
                            <p><i class="fas fa-barcode"></i> ${Utils.escapeHtml(item.isbn)}</p>
                            <p class="wishlist-price">₦${Utils.formatPrice(item.price)}</p>
                        </div>
                        <div class="wishlist-actions">
                            <button class="view-btn" onclick="viewBookDetails('${item.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="remove-btn" onclick="removeFromWishlist('${item.id}')">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                            <button class="add-to-cart-btn" onclick="addToCart('${item.id}', 'book')">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// ==================== CART PAGE FUNCTIONS ====================
function loadCart() {
    const container = document.getElementById('cartContainer');
    if (!container) return;
    
    const cart = CartManager.getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h2>Your cart is empty</h2>
                <p>Browse our books and packages to get started</p>
                <a href="index.html" class="continue-shopping">
                    <i class="fas fa-book"></i> Browse Books
                </a>
            </div>
        `;
        return;
    }

    displayCart(cart);
}

// ==================== PROFESSIONAL CART DISPLAY ====================

function displayCart(cart) {
    const container = document.getElementById('cartContainer');
    if (!container) return;
    
    const subtotal = CartManager.getCartSubtotal();
    const tax = CartManager.getCartTax();
    const total = CartManager.getCartGrandTotal();
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const savings = subtotal * 0.05; // Mock savings (5% discount)

    container.innerHTML = `
        <div class="cart-header-modern">
            <div class="cart-header-left">
                <h1>
                    <i class="fas fa-shopping-cart"></i>
                    Shopping Cart
                </h1>
                <span class="cart-item-count">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</span>
            </div>
            <div class="cart-header-actions">
                <a href="index.html" class="continue-shopping-link">
                    <i class="fas fa-arrow-left"></i> Continue Shopping
                </a>
                ${cart.length > 0 ? `
                    <button class="clear-cart-modern" onclick="clearCart()">
                        <i class="fas fa-trash-alt"></i> Clear Cart
                    </button>
                ` : ''}
            </div>
        </div>

        ${cart.length === 0 ? `
            <div class="empty-cart-modern">
                <div class="empty-cart-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything to your cart yet</p>
                <div class="empty-cart-suggestions">
                    <h3>Popular Categories</h3>
                    <div class="suggestion-chips">
                        <a href="index.html#books" class="chip">📚 Textbooks</a>
                        <a href="packages.html" class="chip">🎁 CA Packages</a>
                        <a href="index.html#books" class="chip">🔬 Science</a>
                        <a href="index.html#books" class="chip">📖 Mathematics</a>
                    </div>
                </div>
                <a href="index.html" class="start-shopping-btn">
                    <i class="fas fa-compass"></i> Start Shopping
                </a>
            </div>
        ` : `
            <div class="cart-layout">
                <!-- Cart Items Section -->
                <div class="cart-items-section">
                    <div class="cart-items-header">
                        <div class="header-product">Product</div>
                        <div class="header-price">Price</div>
                        <div class="header-quantity">Quantity</div>
                        <div class="header-total">Total</div>
                        <div class="header-actions"></div>
                    </div>
                    
                    <div class="cart-items-list">
                        ${cart.map((item, index) => `
                            <div class="cart-item-modern" data-index="${index}">
                                <div class="item-product">
                                    <div class="item-image ${item.itemType}">
                                        <i class="fas fa-${item.itemType === 'book' ? 'book' : 'gift'}"></i>
                                    </div>
                                    <div class="item-info">
                                        <h3 class="item-title">${Utils.escapeHtml(item.name)}</h3>
                                        <div class="item-meta">
                                            <span class="item-type-badge ${item.itemType}">
                                                <i class="fas fa-${item.itemType === 'book' ? 'book' : 'tag'}"></i>
                                                ${item.itemType}
                                            </span>
                                            <span class="item-stock in-stock">
                                                <i class="fas fa-check-circle"></i> In Stock
                                            </span>
                                        </div>
                                        ${item.itemType === 'package' && item.includesCA ? `
                                            <span class="item-feature">
                                                <i class="fas fa-clock"></i> CA Filling Included
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                                
                                <div class="item-price">
                                    <span class="price-label">Price:</span>
                                    <span class="price-value">₦${Utils.formatPrice(item.price)}</span>
                                </div>
                                
                                <div class="item-quantity-modern">
                                    <button class="quantity-btn-modern" onclick="updateCartQuantity(${index}, -1)" 
                                            ${item.quantity <= 1 ? 'disabled' : ''}>
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <input type="text" class="quantity-input-modern" value="${item.quantity}" 
                                           onchange="setCartQuantity(${index}, this.value)" 
                                           onkeypress="return (event.charCode == 8 || event.charCode == 0 || event.charCode == 13) ? true : !isNaN(Number(event.key))">
                                    <button class="quantity-btn-modern" onclick="updateCartQuantity(${index}, 1)" 
                                            ${item.quantity >= 10 ? 'disabled' : ''}>
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                
                                <div class="item-total-modern">
                                    <span class="total-label">Total:</span>
                                    <span class="total-value">₦${Utils.formatPrice(item.total)}</span>
                                </div>
                                
                                <button class="item-remove" onclick="removeCartItem(${index})" title="Remove item">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Order Summary Section -->
                <div class="order-summary-modern">
                    <h2 class="summary-title">
                        <i class="fas fa-receipt"></i>
                        Order Summary
                    </h2>
                    
                    <div class="summary-content">
                        <div class="summary-row">
                            <span class="summary-label">
                                <i class="fas fa-box"></i>
                                Subtotal (${itemCount} items)
                            </span>
                            <span class="summary-amount">₦${Utils.formatPrice(subtotal)}</span>
                        </div>
                        
                        <div class="summary-row">
                            <span class="summary-label">
                                <i class="fas fa-truck"></i>
                                Shipping
                            </span>
                            <span class="summary-amount free-shipping">Free</span>
                        </div>
                        
                        <div class="summary-row">
                            <span class="summary-label">
                                <i class="fas fa-percent"></i>
                                VAT (7.5%)
                            </span>
                            <span class="summary-amount">₦${Utils.formatPrice(tax)}</span>
                        </div>
                        
                        ${savings > 0 ? `
                            <div class="savings-badge-modern">
                                <i class="fas fa-tag"></i>
                                You save: ₦${Utils.formatPrice(savings)}
                            </div>
                        ` : ''}
                        
                        <div class="summary-divider"></div>
                        
                        <div class="summary-row total">
                            <span class="summary-label">
                                <i class="fas fa-calculator"></i>
                                Total
                            </span>
                            <span class="summary-amount total-amount">₦${Utils.formatPrice(total)}</span>
                        </div>

                        <button class="checkout-btn-modern" onclick="proceedToCheckout()">
                            <i class="fas fa-lock"></i>
                            Proceed to Checkout
                            <i class="fas fa-arrow-right"></i>
                        </button>

                        <div class="payment-methods-modern">
                            <p>Accepted Payment Methods</p>
                            <div class="payment-icons">
                                <i class="fab fa-cc-visa" title="Visa"></i>
                                <i class="fab fa-cc-mastercard" title="Mastercard"></i>
                                <i class="fab fa-cc-paypal" title="PayPal"></i>
                                <img src="https://paystack.com/brand-assets/Paystack_Logo.png" alt="Paystack" class="paystack-logo">
                            </div>
                        </div>

                        <div class="security-badge">
                            <i class="fas fa-shield-alt"></i>
                            <div class="security-text">
                                <strong>Secure Checkout</strong>
                                <span>256-bit SSL encrypted</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- You Might Also Like Section -->
            <div class="recommendations-section">
                <h3 class="recommendations-title">
                    <i class="fas fa-thumbs-up"></i>
                    You Might Also Like
                </h3>
                <div class="recommendations-grid">
                    ${generateRecommendations(cart)}
                </div>
            </div>
        `}
    `;

    // Add animation to cart items
    document.querySelectorAll('.cart-item-modern').forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        item.classList.add('fade-in');
    });
}

function generateRecommendations(cart) {
    // Mock recommendations based on cart items
    const recommendations = [
        {
            id: 'rec-1',
            name: 'Study Guide Bundle',
            price: 2500,
            type: 'package',
            image: 'fa-book-open'
        },
        {
            id: 'rec-2',
            name: 'Past Questions Compilation',
            price: 1800,
            type: 'book',
            image: 'fa-file-alt'
        },
        {
            id: 'rec-3',
            name: 'Premium Calculator',
            price: 3200,
            type: 'accessory',
            image: 'fa-calculator'
        }
    ];

    return recommendations.map(rec => `
        <div class="recommendation-card" onclick="addToCart('${rec.id}', '${rec.type}')">
            <div class="rec-image">
                <i class="fas ${rec.image}"></i>
            </div>
            <div class="rec-info">
                <h4>${rec.name}</h4>
                <p class="rec-price">₦${Utils.formatPrice(rec.price)}</p>
                <button class="rec-add-btn">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        </div>
    `).join('');
}

function updateCartQuantity(index, change) {
    const cart = CartManager.updateQuantity(index, change);
    if (cart) {
        displayCart(cart);
        updateCartCount();
        
        // Show feedback
        const item = document.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            setTimeout(() => {
                item.style.backgroundColor = '';
            }, 300);
        }
    }
}

function setCartQuantity(index, value) {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) {
        // Reset to current value if invalid
        const cart = CartManager.getCart();
        const item = cart[index];
        if (item) {
            const input = document.querySelector(`[data-index="${index}"] .quantity-input-modern`);
            if (input) input.value = item.quantity;
        }
        return;
    }
    
    if (numValue > 10) {
        Utils.showNotification('Maximum quantity is 10', 'warning');
        return;
    }
    
    const cart = CartManager.setQuantity(index, numValue);
    if (cart) {
        displayCart(cart);
        updateCartCount();
    }
}

function removeCartItem(index) {
    const cart = CartManager.getCart();
    const item = cart[index];
    
    // Create custom confirm dialog
    if (confirm(`Remove "${item.name}" from your cart?`)) {
        CartManager.removeItem(index);
        displayCart(CartManager.getCart());
        updateCartCount();
        Utils.showNotification('Item removed from cart', 'success');
    }
}

function clearCart() {
    const cart = CartManager.getCart();
    if (cart.length > 0 && confirm('Are you sure you want to remove all items from your cart?')) {
        CartManager.clearCart();
        displayCart([]);
        Utils.showNotification('Cart cleared', 'info');
    }
}

function updateCartQuantity(index, change) {
    const cart = CartManager.updateQuantity(index, change);
    if (cart) {
        displayCart(cart);
    }
}

function setCartQuantity(index, value) {
    const cart = CartManager.setQuantity(index, value);
    if (cart) {
        displayCart(cart);
    }
}

function removeCartItem(index) {
    const cart = CartManager.removeItem(index);
    displayCart(cart);
    CartManager.updateCartCount();
}

function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
        CartManager.clearCart();
        loadCart();
    }
}

function proceedToCheckout() {
    window.location.href = 'checkout.html';
}

// ==================== CHECKOUT FUNCTIONS ====================
function loadCheckout() {
    const container = document.getElementById('checkoutContainer');
    if (!container) return;
    
    const cart = CartManager.getCart();
    
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    displayCheckout(cart);
}

function displayCheckout(cart) {
    const container = document.getElementById('checkoutContainer');
    if (!container) return;
    
    const subtotal = CartManager.getCartSubtotal();
    const tax = CartManager.getCartTax();
    const total = CartManager.getCartGrandTotal();

    container.innerHTML = `
        <div class="checkout-header">
            <h1><i class="fas fa-credit-card"></i> Checkout</h1>
        </div>

        <div class="checkout-content">
            <div class="order-summary">
                <h3 class="summary-title">Order Summary</h3>
                <div class="checkout-items">
                    ${cart.map(item => `
                        <div class="checkout-item">
                            <div class="item-info">
                                <h4>${Utils.escapeHtml(item.name)}</h4>
                                <p>Qty: ${item.quantity} × ₦${Utils.formatPrice(item.price)}</p>
                            </div>
                            <span class="item-price">₦${Utils.formatPrice(item.total)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>₦${Utils.formatPrice(subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>VAT (7.5%)</span>
                    <span>₦${Utils.formatPrice(tax)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span>₦${Utils.formatPrice(total)}</span>
                </div>
            </div>

            <div class="checkout-form">
                <h3 class="form-title">Delivery Information</h3>
                
                <div id="errorMessage" class="error-message"></div>
                
                <form id="checkoutForm" onsubmit="handleCheckoutSubmit(event)">
                    <div class="form-group">
                        <label for="fullName">Full Name *</label>
                        <input type="text" id="fullName" required 
                               placeholder="Enter your full name">
                    </div>

                    <div class="form-group">
                        <label for="phone">Phone Number *</label>
                        <input type="tel" id="phone" required 
                               placeholder="e.g., 08012345678"
                               pattern="[0-9]{11}" 
                               title="Please enter a valid 11-digit Nigerian phone number">
                    </div>

                    <div class="form-group">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" required 
                               placeholder="your@email.com">
                    </div>

                    <div class="form-group">
                        <label for="address">Delivery Address *</label>
                        <textarea id="address" rows="3" required 
                                  placeholder="Enter your full delivery address"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="city">City *</label>
                            <input type="text" id="city" required 
                                   placeholder="e.g., Nsukka">
                        </div>
                        <div class="form-group">
                            <label for="state">State *</label>
                            <select id="state" required>
                                <option value="">Select State</option>
                                <option value="Abia">Abia</option>
                                <option value="Abuja">Abuja</option>
                                <option value="Anambra">Anambra</option>
                                <option value="Ebonyi">Ebonyi</option>
                                <option value="Enugu">Enugu</option>
                                <option value="Imo">Imo</option>
                                <option value="Lagos">Lagos</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="notes">Additional Notes (Optional)</label>
                        <textarea id="notes" rows="2" 
                                  placeholder="Any special instructions?"></textarea>
                    </div>

                    <button type="submit" class="checkout-btn" id="payBtn">
                        <i class="fas fa-lock"></i> Pay ₦${Utils.formatPrice(total)} with Paystack
                    </button>
                    
                    <div class="secure-badge">
                        <i class="fas fa-shield-alt"></i>
                        <span>Secured by Paystack | 256-bit SSL Encrypted</span>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Pre-fill user data
    const user = Utils.getUserInfo();
    if (user) {
        const emailInput = document.getElementById('email');
        const nameInput = document.getElementById('fullName');
        if (emailInput && user.email) emailInput.value = user.email;
        if (nameInput && user.name) nameInput.value = user.name;
    }
}

async function handleCheckoutSubmit(event) {
    event.preventDefault();
    
    const payBtn = document.getElementById('payBtn');
    const errorDiv = document.getElementById('errorMessage');
    
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value;
    const notes = document.getElementById('notes').value.trim();

    if (!fullName || !phone || !email || !address || !city || !state) {
        showCheckoutError('Please fill in all required fields');
        return;
    }

    if (!/^[0-9]{11}$/.test(phone)) {
        showCheckoutError('Please enter a valid 11-digit phone number');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showCheckoutError('Please enter a valid email address');
        return;
    }

    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    errorDiv.classList.remove('show');

    try {
        const cart = CartManager.getCart();
        
        const orderData = {
            items: cart.map(item => ({
                itemType: item.itemType,
                itemId: item.itemId,
                quantity: item.quantity
            })),
            deliveryAddress: {
                street: address,
                city,
                state,
                country: 'Nigeria'
            },
            phone,
            notes
        };

        const response = await Utils.apiRequest('/checkout/initialize', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        if (response?.success) {
            localStorage.setItem('currentOrder', JSON.stringify({
                orderId: response.data.orderId,
                reference: response.data.reference
            }));

            window.location.href = response.data.authorization_url;
        } else {
            showCheckoutError(response?.message || 'Failed to initialize payment');
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay with Paystack';
        }
    } catch (error) {
        showCheckoutError('Failed to initialize payment. Please try again.');
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay with Paystack';
    }
}

function showCheckoutError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

// ==================== PAYMENT CALLBACK FUNCTIONS ====================
async function verifyPayment(reference) {
    const token = Utils.getToken();
    
    if (!token) {
        showPaymentError('Please login to verify payment');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        return;
    }

    try {
        const response = await Utils.apiRequest(`/checkout/verify/${reference}`);
        
        if (response?.success && response.data.status === 'success') {
            CartManager.clearCart();
            localStorage.removeItem('currentOrder');
            showPaymentSuccess(reference, response.data.orderNumber);
        } else {
            showPaymentPending(reference);
        }
    } catch (error) {
        showPaymentError('Failed to verify payment');
    }
}

function showPaymentSuccess(reference, orderNumber) {
    const container = document.getElementById('statusContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="status-icon success">
            <i class="fas fa-check-circle"></i>
        </div>
        <h2 class="status-title">Payment Successful!</h2>
        <p class="status-message">
            Thank you for your purchase. Your order has been confirmed.
        </p>
        <div class="order-details">
            <h3>Order Details</h3>
            <div class="detail-row">
                <span class="detail-label">Order Number:</span>
                <span class="detail-value">${orderNumber || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value">${reference}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color:#22c55e;">Paid</span>
            </div>
        </div>
        <div class="action-buttons">
            <a href="index.html" class="btn-primary">
                <i class="fas fa-tachometer-alt"></i> Go to Dashboard
            </a>
            <a href="packages.html" class="btn-outline">
                <i class="fas fa-gift"></i> Continue Shopping
            </a>
        </div>
    `;
}

function showPaymentPending(reference) {
    const container = document.getElementById('statusContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="status-icon pending">
            <i class="fas fa-clock"></i>
        </div>
        <h2 class="status-title">Payment Processing</h2>
        <p class="status-message">
            Your payment is being processed. We'll notify you once confirmed.
        </p>
        <div class="order-details">
            <h3>Reference</h3>
            <div class="detail-row">
                <span class="detail-value">${reference}</span>
            </div>
        </div>
        <div class="action-buttons">
            <a href="index.html" class="btn-primary">
                <i class="fas fa-tachometer-alt"></i> Check Status
            </a>
            <a href="index.html" class="btn-outline">
                <i class="fas fa-home"></i> Return Home
            </a>
        </div>
    `;
}

function showPaymentError(message) {
    const container = document.getElementById('statusContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="status-icon failed">
            <i class="fas fa-times-circle"></i>
        </div>
        <h2 class="status-title">Payment Failed</h2>
        <p class="status-message">${message || 'Something went wrong with your payment.'}</p>
        <div class="action-buttons">
            <a href="cart.html" class="btn-primary">
                <i class="fas fa-shopping-cart"></i> Return to Cart
            </a>
            <a href="index.html" class="btn-outline">
                <i class="fas fa-home"></i> Home
            </a>
        </div>
    `;
}

// ==================== VIEW BOOK DETAILS MODAL ====================
function viewBookDetails(bookId) {
    if (!Utils.isValidId(bookId)) {
        Utils.showNotification("Invalid book selection", "error");
        return;
    }

    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        Utils.showNotification("Book not found", "error");
        return;
    }

    const wishlist = WishlistManager.getWishlist();
    const isInWishlist = wishlist.some(item => item.id === bookId);
    const isDarkMode = document.body.classList.contains('dark-mode');

    const modal = document.createElement('div');
    modal.className = 'secure-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="
            background: ${isDarkMode ? '#1e1e1e' : '#ffffff'};
            color: ${isDarkMode ? '#e0e0e0' : '#222'};
            border-radius: 16px;
            max-width: 620px;
            width: 100%;
            max-height: 92vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        ">
            <div class="modal-header" style="
                padding: 24px 28px;
                border-bottom: 1px solid ${isDarkMode ? '#333' : '#eee'};
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h2 style="margin: 0; font-size: 1.5rem; color: ${isDarkMode ? '#95d5b2' : '#2c3e50'};">
                    ${Utils.escapeHtml(book.title)}
                </h2>
                <button class="modal-close" style="
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: ${isDarkMode ? '#aaa' : '#666'};
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">&times;</button>
            </div>

            <div class="modal-body" style="padding: 28px;">
                <div style="display: grid; grid-template-columns: 160px 1fr; gap: 28px;">
                    <div style="
                        width: 160px;
                        height: 220px;
                        background: ${isDarkMode ? '#2a2a2a' : '#f8f9fa'};
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 70px;
                        color: ${isDarkMode ? '#4ade80' : '#6c757d'};
                        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    ">
                        <i class="fas fa-book-open"></i>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div><strong>Author:</strong> ${Utils.escapeHtml(book.author)}</div>
                        <div><strong>Course Code:</strong> ${Utils.escapeHtml(book.isbn)}</div>
                        <div><strong>Level:</strong> ${Utils.escapeHtml(BooksManager.getBookLevel(book.isbn))} Level</div>
                        <div><strong>Category:</strong> ${Utils.escapeHtml(BooksManager.getCategoryName(book.category))}</div>
                        <div><strong>Price:</strong> <span style="color:#22c55e; font-weight:600;">₦${Utils.formatPrice(book.price)}</span></div>
                        <div><strong>Available:</strong> 
                            <span style="color:${book.quantity > 0 ? '#22c55e' : '#ef4444'}; font-weight:600;">
                                ${book.quantity} copies
                            </span>
                        </div>
                        <div><strong>Added:</strong> ${Utils.formatDate(book.createdAt)}</div>
                    </div>
                </div>

                <div style="margin-top: 32px; display: flex; gap: 16px; justify-content: center;">
                    <button id="modalWishlistBtn" data-book-id="${Utils.escapeHtml(bookId)}" style="
                        background: ${isInWishlist ? '#166534' : '#22c55e'};
                        color: white;
                        border: none;
                        padding: 14px 30px;
                        font-size: 1rem;
                        font-weight: 600;
                        border-radius: 50px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);
                    ">
                        <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
                        ${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                    <button id="modalAddToCartBtn" data-book-id="${Utils.escapeHtml(bookId)}" style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 14px 30px;
                        font-size: 1rem;
                        font-weight: 600;
                        border-radius: 50px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
                    ">
                        <i class="fas fa-cart-plus"></i>
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    // Wishlist button
    const wishlistBtn = modal.querySelector('#modalWishlistBtn');
    wishlistBtn.addEventListener('click', () => {
        toggleWishlist(bookId, null);
        modal.remove();
    });

    // Add to cart button
    const cartBtn = modal.querySelector('#modalAddToCartBtn');
    cartBtn.addEventListener('click', async () => {
        await addToCart(bookId, 'book');
        modal.remove();
    });
}

// ==================== GLOBAL FUNCTIONS ====================
function toggleTheme() {
    ThemeManager.toggle();
}

function toggleViewMode() {
    const currentView = localStorage.getItem(CONFIG.VIEW_MODE_KEY) || 'grid';
    const newView = currentView === 'grid' ? 'list' : 'grid';
    setViewMode(newView);
}

function setViewMode(view) {
    localStorage.setItem(CONFIG.VIEW_MODE_KEY, view);
    
    const container = document.getElementById('booksContainer');
    if (container) {
        container.classList.remove('grid-view', 'list-view');
        container.classList.add(`${view}-view`);
    }
    
    // Update active button
    document.querySelectorAll('.view-controls .view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === view) {
            btn.classList.add('active');
        }
    });
    
    // Refresh displays
    if (document.getElementById('booksContainer')) {
        BooksManager.applyFilters();
    }
    if (document.getElementById('wishlistContainer')) {
        loadWishlist();
    }
}

function changePage(page) {
    window.currentPage = page;
    BooksManager.applyFilters();
}

function clearFilters() {
    const searchInput = document.getElementById("searchInput");
    const yearFilter = document.getElementById("yearFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const sortFilter = document.getElementById("sortFilter");
    
    if (searchInput) searchInput.value = "";
    if (yearFilter) yearFilter.value = "all";
    if (categoryFilter) categoryFilter.value = "all";
    if (sortFilter) sortFilter.value = "newest";
    
    window.currentPage = 1;
    BooksManager.applyFilters();
    Utils.showNotification("Filters cleared", "info");
}

async function addToCart(itemId, itemType) {
    await CartManager.addItem(itemType, itemId);
}

function toggleWishlist(bookId, button) {
    if (!Utils.isValidId(bookId)) {
        Utils.showNotification("Invalid book selection", "error");
        return;
    }
    
    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        Utils.showNotification("Book not found", "error");
        return;
    }
    
    WishlistManager.toggleItem(book, button);
}

function removeFromWishlist(bookId) {
    WishlistManager.removeItem(bookId);
    loadWishlist();
    Utils.showNotification('Removed from wishlist', 'success');
}

function viewPackageDetails(packageId) {
    Utils.showNotification('Package details coming soon!', 'info');
}

function navigateToSection(section) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(section) {
            case 'books':
                BooksManager.loadBooks();
                break;
            case 'packages':
                loadPackages();
                break;
            case 'orders':
                loadAllOrders();
                break;
            case 'wishlist':
                loadWishlist();
                break;
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
        localStorage.removeItem(CONFIG.CART_STORAGE_KEY);
        localStorage.removeItem(CONFIG.WISHLIST_STORAGE_KEY);
        
        Utils.showNotification("Logged out successfully", "success");
        
        setTimeout(() => {
            window.location.href = "../Student-dahbord/login.html";
        }, 1000);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    // Check authentication
    if (!Utils.requireAuth()) return;

    // Initialize state
    window.currentPage = 1;
    window.pageSize = parseInt(localStorage.getItem(CONFIG.PAGE_SIZE_KEY)) || CONFIG.DEFAULT_PAGE_SIZE;
    
    // Initialize theme
    ThemeManager.init();
    
    // Update counts
    WishlistManager.updateWishlistCount();
    CartManager.updateCartCount();
    
    // Update user info
    const user = Utils.getUserInfo();
    if (user) {
        document.querySelectorAll('.username').forEach(el => {
            if (el) el.textContent = user.name || 'Student';
        });
        const studentNameEl = document.getElementById('studentName');
        if (studentNameEl) studentNameEl.textContent = user.name || 'Student';
    }
    
    // Initialize navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            navigateToSection(section);
        });
    });
    
    // Initialize components based on current page
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path.endsWith('/')) {
        // Dashboard page
        initializeDashboard();
    } else if (path.includes('packages.html')) {
        // Packages page
        initializePackagesPage();
    } else if (path.includes('cart.html')) {
        // Cart page
        initializeCartPage();
    } else if (path.includes('checkout.html')) {
        // Checkout page
        initializeCheckoutPage();
    } else if (path.includes('payment-callback.html')) {
        // Payment callback page
        initializePaymentCallback();
    }
    
    // Logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
});

function initializeDashboard() {
    // Set home section as active
    document.getElementById('homeSection')?.classList.add('active');
    
    // Load dashboard data
    loadCABooking();
    loadRecentOrders();
    loadCAHistory();
    loadQuickStats();
    
    // Initialize books section components
    initializeBooksComponents();
}

function initializePackagesPage() {
    loadPackages();
}

function initializeCartPage() {
    loadCart();
}

function initializeCheckoutPage() {
    loadCheckout();
}

function initializePaymentCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    
    if (reference) {
        verifyPayment(reference);
    } else {
        showPaymentError('No payment reference found');
    }
}

function initializeBooksComponents() {
    // View controls
    const view = localStorage.getItem(CONFIG.VIEW_MODE_KEY) || 'grid';
    setViewMode(view);
    
    // Page size selector
    const pageSizeSelect = document.getElementById('pageSize');
    if (pageSizeSelect) {
        pageSizeSelect.value = window.pageSize;
        pageSizeSelect.addEventListener('change', (e) => {
            window.pageSize = parseInt(e.target.value);
            localStorage.setItem(CONFIG.PAGE_SIZE_KEY, window.pageSize);
            window.currentPage = 1;
            BooksManager.applyFilters();
        });
    }
    
    // Sort selector
    const sortSelect = document.getElementById('sortFilter');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            window.currentPage = 1;
            BooksManager.applyFilters();
        });
    }
    
    // Search input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", Utils.debounce(() => {
            window.currentPage = 1;
            BooksManager.applyFilters();
        }, 300));
    }
    
    // Filters
    const yearFilter = document.getElementById("yearFilter");
    if (yearFilter) {
        yearFilter.addEventListener("change", () => {
            window.currentPage = 1;
            BooksManager.applyFilters();
        });
    }
    
    const categoryFilter = document.getElementById("categoryFilter");
    if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
            window.currentPage = 1;
            BooksManager.applyFilters();
        });
    }
    
    // Search button
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            window.currentPage = 1;
            BooksManager.applyFilters();
        });
    }
    
    // Clear button
    const clearBtn = document.querySelector('.clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // Quick search chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = chip.textContent;
                window.currentPage = 1;
                BooksManager.applyFilters();
            }
        });
    });
    
    // Load books
    BooksManager.loadBooks();
}

// ==================== SECURITY MEASURES ====================
(function() {
    // Hide sensitive data from console
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = function(...args) {
        const safeArgs = args.map(arg => {
            if (typeof arg === 'string' && (
                arg.includes('token') || 
                arg.includes('Token') || 
                arg.includes('Authorization') ||
                arg.includes('password') ||
                arg.includes('Password') ||
                arg.includes('secret') ||
                arg.includes('Secret')
            )) {
                return '[REDACTED]';
            }
            return arg;
        });
        originalConsoleLog.apply(console, safeArgs);
    };
    
    console.error = function(...args) {
        originalConsoleError.apply(console, ['[Security: Error details hidden]']);
    };
    
    // Prevent right-click on sensitive elements
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.book-card') || 
            e.target.closest('.secure-modal') ||
            e.target.closest('.notification')) {
            e.preventDefault();
        }
    }, false);
    
    // Prevent text selection on sensitive elements
    document.addEventListener('selectstart', (e) => {
        if (e.target.closest('.book-card') || 
            e.target.closest('.secure-modal')) {
            e.preventDefault();
        }
    }, false);
    
    // Prevent drag and drop
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.book-card')) {
            e.preventDefault();
        }
    }, false);
})();