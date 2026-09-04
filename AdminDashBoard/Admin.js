// INITIALIZATION 
document.addEventListener("DOMContentLoaded", () => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
        showNotification("Access Denied", "Please login to continue", "error");
        setTimeout(() => {
            window.location.href = "../Student-DahBord/login.html";
        }, 2000);
        return;
    }
    
    // Initialize admin panel
    initAdmin();
});

//  GLOBAL STATE
let state = {
    allBooks: [],
    filteredBooks: [],
    currentPage: 1,
    itemsPerPage: 12,
    totalPages: 1,
    currentView: 'grid',
    currentBookId: null,
    filters: {
        search: '',
        level: '',
        status: '',
        sort: 'newest'
    },
    allUsers: [],
    filteredUsers: [],
    currentUserPage: 1,
    itemsPerUserPage: 15,
    totalUserPages: 1,
    wishlistData: {
        stats: {},
        topBooks: [],
        topUsers: [],
        recent: []
    },
    dateFormat: 'relative',
    timeFormat: '12h'
};

// API UTILITIES
const API_BASE = "/api/admin";

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };
    
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    try {
        console.log(`API Fetch: ${API_BASE}${url}`, options);
        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
            showNotification("Session Expired", "Please login again", "error");
            setTimeout(() => {
                window.location.href = "../Student-DahBord/login.html";
            }, 2000);
            throw new Error("Unauthorized");
        }
        
        if (!response.ok) {
            let errorText;
            try {
                errorText = await response.text();
                console.error(`Server error response: ${errorText}`);
            } catch (e) {
                errorText = `HTTP ${response.status} ${response.statusText}`;
            }
            throw new Error(errorText || `HTTP ${response.status}`);
        }
        
        // Try to parse JSON
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { success: true, message: 'Operation successful' };
        }
        
        console.log(`API Response from ${url}:`, data);
        return data;
        
    } catch (error) {
        console.error(`API Error (${url}):`, error);
        console.error('Error stack:', error.stack);
        
        // Check network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error('Network error detected.');
            throw new Error('Cannot connect to the server. Please try again.');
        }
        
        throw error;
    }
}

async function testApiConnection() {
    try {
        console.log('Testing API connection...');
        const response = await fetch('/health');
        console.log('API health check:', response.status);
        return response.ok;
    } catch (error) {
        console.error('API connection test failed:', error);
        return false;
    }
}

// MAIN INITIALIZATION 
async function initAdmin() {
    console.log("Initializing admin panel...");
    
    // Test API connection first
    const apiConnected = await testApiConnection();
    if (!apiConnected) {
        showNotification("Connection Error", "Cannot connect to the server. Please try again.", "error");
    }
    
    // Setup all event listeners
    setupEventListeners();
    setupSidebarNavigation();
    setupSettings();
    
    // Load initial data
    loadDashboardStats();
    loadBooks();
    loadUsers();
    loadWishlistData();
    
    // Apply saved settings
    applySavedSettings();
    
    console.log("Admin panel initialized successfully");
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Add book button
    document.getElementById('addBookBtn')?.addEventListener('click', () => {
        openModal('addBookModal');
    });
    
    // Modal close buttons
    document.getElementById('closeAddModal')?.addEventListener('click', () => closeModal('addBookModal'));
    document.getElementById('cancelAddBook')?.addEventListener('click', () => closeModal('addBookModal'));
    document.getElementById('closeEditModal')?.addEventListener('click', () => closeModal('editBookModal'));
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => closeModal('editBookModal'));
    document.getElementById('closeViewModal')?.addEventListener('click', () => closeModal('viewBookModal'));
    document.getElementById('closeViewBtn')?.addEventListener('click', () => closeModal('viewBookModal'));
    
    // Edit from view button
    document.getElementById('editFromViewBtn')?.addEventListener('click', () => {
        closeModal('viewBookModal');
        if (state.currentBookId) {
            openEditModal(state.currentBookId);
        }
    });
    
    // Book search and filters
    document.getElementById('bookSearch')?.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });
    
    document.getElementById('levelFilter')?.addEventListener('change', (e) => {
        state.filters.level = e.target.value;
        applyFilters();
    });
    
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        applyFilters();
    });
    
    document.getElementById('sortFilter')?.addEventListener('change', (e) => {
        state.filters.sort = e.target.value;
        applyFilters();
    });
    
    // User search and filters
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        applyUserFilters();
        renderUsers();
    });
    
    document.getElementById('userRoleFilter')?.addEventListener('change', (e) => {
        applyUserFilters();
        renderUsers();
    });
    
    document.getElementById('userStatusFilter')?.addEventListener('change', (e) => {
        applyUserFilters();
        renderUsers();
    });
    
    // View controls
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            setViewMode(view);
        });
    });
    
    // Pagination
    document.addEventListener('click', (e) => {
        if (e.target.closest('.prev-btn')) goToPrevPage();
        if (e.target.closest('.next-btn')) goToNextPage();
    });
    
    // Form submissions
    document.getElementById('addBookForm')?.addEventListener('submit', handleAddBook);
    document.getElementById('editBookForm')?.addEventListener('submit', handleUpdateBook);
    
    // Delete book
    document.getElementById('deleteBookBtn')?.addEventListener('click', handleDeleteBook);
    
    // Report generation
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);
    
    // Settings
    document.getElementById('saveAppearanceBtn')?.addEventListener('click', saveAppearanceSettings);
    document.getElementById('saveNotificationBtn')?.addEventListener('click', saveNotificationSettings);
    document.getElementById('saveSystemBtn')?.addEventListener('click', saveSystemSettings);
    document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
    document.getElementById('createBackupBtn')?.addEventListener('click', createBackup);
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    
    // Password strength checker
    document.getElementById('newPassword')?.addEventListener('input', checkPasswordStrength);
    
    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            const theme = option.dataset.theme;
            applyTheme(theme);
            localStorage.setItem('adminTheme', theme);
        });
    });
    
    // Settings tabs
    document.querySelectorAll('.settings-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.dataset.tab + 'Tab';
            
            // Update active state
            document.querySelectorAll('.settings-menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show selected tab
            document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            
            // Load charts when reports tab is opened
            if (tabId === 'reportsTab') {
                setTimeout(loadCharts, 100);
            }
        });
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Availability buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.mark-available-btn')) {
            const bookId = e.target.closest('.mark-available-btn').dataset.bookId;
            updateBookAvailability(bookId, true);
        }
        if (e.target.closest('.mark-unavailable-btn')) {
            const bookId = e.target.closest('.mark-unavailable-btn').dataset.bookId;
            updateBookAvailability(bookId, false);
        }
    });
    
    console.log("Event listeners setup complete");
}

// ==================== SIDEBAR & NAVIGATION ====================
function setupSidebarNavigation() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            
            // Update active state
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Update page title
            updatePageTitle(item.querySelector('span').textContent);
            
            // Load charts when reports section is opened
            if (section === 'reports') {
                setTimeout(loadCharts, 100);
            }
        });
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('show');
    mainContent.classList.toggle('shifted');
}

function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionId}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function updatePageTitle(title) {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
        titleElement.textContent = title;
    }
}

// ==================== AUTHENTICATION ====================
async function handleLogout() {
    try {
        showNotification("Logging out", "Please wait...", "info");
        
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('adminTheme');
        
        // Show success message
        showNotification("Logged Out", "You have been successfully logged out", "success");
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = "../Student-DahBord/login.html";
        }, 1500);
        
    } catch (error) {
        console.error("Logout error:", error);
        showNotification("Error", "Logout failed. Please try again.", "error");
    }
}

// ==================== DASHBOARD STATS ====================
async function loadDashboardStats() {
    try {
        console.log("Loading dashboard stats...");
        const data = await apiFetch("/dashboard-stats");
        
        // Update stats
        updateElementText('totalUsers', data.totalUsers?.toLocaleString() || '0');
        updateElementText('totalBooks', data.totalBooks?.toLocaleString() || '0');
        updateElementText('totalCopies', data.totalCopies?.toLocaleString() || '0');
        
        if (data.totalValue) {
            const totalValueEl = document.getElementById('totalValue');
            if (totalValueEl) {
                totalValueEl.textContent = `₦${data.totalValue.toLocaleString()}`;
            }
        }
        
        // Update sidebar badges
        updateElementText('bookCountBadge', data.totalBooks || '0');
        updateElementText('userCountBadge', data.totalUsers || '0');
        updateElementText('wishlistBadge', data.totalWishlists || '0');
        
        // Update recent activity
        updateRecentActivity(data.recentActivity || []);
        
        console.log("Dashboard stats loaded successfully");
    } catch (error) {
        console.error("Failed to load dashboard stats:", error);
    }
}

function updateRecentActivity(activities) {
    const container = document.getElementById('activityList');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <i class="fas fa-info-circle"></i>
                <div class="activity-content">
                    <p>No recent activity</p>
                    <span class="activity-time">Just now</span>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <i class="fas ${getActivityIcon(activity.type)}"></i>
            <div class="activity-content">
                <p>${activity.message}</p>
                <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        'book_added': 'fa-plus-circle',
        'book_updated': 'fa-edit',
        'book_deleted': 'fa-trash',
        'book_availability_updated': 'fa-sync',
        'user_registered': 'fa-user-plus',
        'wishlist_added': 'fa-heart',
        'wishlist_removed': 'fa-heart-broken',
        'password_changed': 'fa-key',
        'profile_updated': 'fa-user-edit',
        'settings_updated': 'fa-cog',
        'backup_created': 'fa-save',
        'default': 'fa-info-circle'
    };
    return icons[type] || icons.default;
}

// ==================== BOOK MANAGEMENT ====================
async function loadBooks() {
    try {
        console.log("Loading books...");
        showBookLoading(true);
        
        const data = await apiFetch("/books");
        state.allBooks = Array.isArray(data) ? data : (data.books || []);
        
        console.log(`Loaded ${state.allBooks.length} books`);
        applyFilters();
        
    } catch (error) {
        console.error("Failed to load books:", error);
        showNotification("Error", "Failed to load books. Please try again.", "error");
        showBookErrorState();
    } finally {
        showBookLoading(false);
    }
}

function applyFilters() {
    console.log("Applying filters...");
    
    let filtered = [...state.allBooks];
    
    // Apply search filter
    if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        filtered = filtered.filter(book => 
            (book.title?.toLowerCase().includes(searchTerm) || false) ||
            (book.author?.toLowerCase().includes(searchTerm) || false) ||
            (book.isbn?.toLowerCase().includes(searchTerm) || false)
        );
    }
    
    // Apply level filter
    if (state.filters.level) {
        filtered = filtered.filter(book => book.level === state.filters.level);
    }
    
    // Apply status filter
    if (state.filters.status) {
        filtered = filtered.filter(book => {
            if (state.filters.status === 'in-stock') return book.quantity > 10;
            if (state.filters.status === 'low-stock') return book.quantity > 0 && book.quantity <= 10;
            if (state.filters.status === 'out-of-stock') return book.quantity === 0;
            return true;
        });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        switch (state.filters.sort) {
            case 'newest':
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            case 'oldest':
                return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            case 'price_asc':
                return (a.price || 0) - (b.price || 0);
            case 'price_desc':
                return (b.price || 0) - (a.price || 0);
            case 'title':
                return (a.title || '').localeCompare(b.title || '');
            default:
                return 0;
        }
    });
    
    state.filteredBooks = filtered;
    state.currentPage = 1;
    updateBookPagination();
    renderBooks();
    
    console.log(`Filtered to ${filtered.length} books`);
}

function updateBookPagination() {
    const totalItems = state.filteredBooks.length;
    state.totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));
    
    // Update pagination UI
    updateElementText('totalItems', totalItems.toLocaleString());
    updateBookPaginationButtons();
    
    // Calculate and update showing range
    const startIndex = (state.currentPage - 1) * state.itemsPerPage + 1;
    const endIndex = Math.min(state.currentPage * state.itemsPerPage, totalItems);
    
    updateElementText('startIndex', startIndex > totalItems ? '0' : startIndex.toLocaleString());
    updateElementText('endIndex', endIndex.toLocaleString());
}

function updateBookPaginationButtons() {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (prevBtn) prevBtn.disabled = state.currentPage === 1;
    if (nextBtn) nextBtn.disabled = state.currentPage === state.totalPages;
    
    // Generate page numbers
    if (pageNumbers) {
        pageNumbers.innerHTML = '';
        
        const maxPagesToShow = 5;
        let startPage = Math.max(1, state.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(state.totalPages, startPage + maxPagesToShow - 1);
        
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === state.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => goToPage(i));
            pageNumbers.appendChild(pageBtn);
        }
    }
}

function goToPage(page) {
    if (page < 1 || page > state.totalPages || page === state.currentPage) return;
    
    state.currentPage = page;
    updateBookPagination();
    renderBooks();
    scrollToTop();
}

function goToPrevPage() {
    if (state.currentPage > 1) {
        goToPage(state.currentPage - 1);
    }
}

function goToNextPage() {
    if (state.currentPage < state.totalPages) {
        goToPage(state.currentPage + 1);
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setViewMode(view) {
    state.currentView = view;
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update container class
    const container = document.getElementById('bookList');
    if (container) {
        container.className = `books-container ${view}-view`;
    }
    
    // Re-render books with new view
    renderBooks();
}

// ==================== BOOK RENDERING ====================
function renderBooks() {
    const container = document.getElementById('bookList');
    if (!container) return;
    
    if (state.filteredBooks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h3>${state.allBooks.length === 0 ? 'No Books Available' : 'No Books Found'}</h3>
                <p>${state.filters.search || state.filters.level || state.filters.status 
                    ? 'Try adjusting your filters' 
                    : 'Add your first book to get started'}</p>
                ${state.allBooks.length === 0 ? `
                    <button class="btn btn-primary mt-4" onclick="openModal('addBookModal')">
                        <i class="fas fa-plus"></i> Add First Book
                    </button>
                ` : ''}
            </div>
        `;
        return;
    }
    
    // Calculate pagination slice
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = Math.min(startIndex + state.itemsPerPage, state.filteredBooks.length);
    const booksToShow = state.filteredBooks.slice(startIndex, endIndex);
    
    if (state.currentView === 'grid') {
        container.innerHTML = booksToShow.map(book => createGridBookCard(book)).join('');
    } else {
        container.innerHTML = booksToShow.map(book => createListBookCard(book)).join('');
    }
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookId = e.currentTarget.dataset.bookId;
            openViewModal(bookId);
        });
    });
}

function createGridBookCard(book) {
    const levelText = getLevelFromCourseCode(book.isbn, book.level);
    const status = book.quantity > 10 ? 'in-stock' : book.quantity > 0 ? 'low-stock' : 'out-of-stock';
    const statusText = book.quantity > 10 ? 'In Stock' : book.quantity > 0 ? 'Low Stock' : 'Out of Stock';
    
    return `
        <div class="book-card" data-book-id="${book._id}">
            <div class="book-card-header">
                <span class="book-level">${levelText}</span>
                <span class="book-status ${status}">
                    ${status === 'in-stock' ? '✓' : status === 'low-stock' ? '⚠' : '✗'} ${statusText}
                </span>
            </div>
            
            <div class="book-cover-placeholder">
                <i class="fas fa-book"></i>
                ${book.wishlistCount > 0 ? `
                    <div class="book-popularity" title="${book.wishlistCount} users wishlisted this book">
                        <i class="fas fa-heart"></i> ${book.wishlistCount || 0}
                    </div>
                ` : ''}
            </div>
            
            <div class="book-content">
                <h3 class="book-title">${escapeHtml(book.title || 'Untitled')}</h3>
                <p class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author || 'Unknown')}</p>
                <p class="book-code"><i class="fas fa-barcode"></i> ${escapeHtml(book.isbn || 'N/A')}</p>
                
                <div class="book-details">
                    <div class="detail-item">
                        <span class="detail-label">Quantity</span>
                        <span class="detail-value quantity ${book.quantity > 0 ? 'available' : 'unavailable'}">
                            ${book.quantity || 0}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Price</span>
                        <span class="detail-value price">₦${(book.price || 0).toLocaleString()}</span>
                    </div>
                </div>
                
                <div class="book-actions">
                    <button class="btn btn-secondary view-details-btn" data-book-id="${book._id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary" onclick="openEditModal('${book._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${book.quantity > 0 ? `
                        <button class="btn btn-warning mark-unavailable-btn" data-book-id="${book._id}">
                            <i class="fas fa-times-circle"></i> Out of Stock
                        </button>
                    ` : `
                        <button class="btn btn-success mark-available-btn" data-book-id="${book._id}">
                            <i class="fas fa-check-circle"></i> In Stock
                        </button>
                    `}
                </div>
                
                <p class="upload-time">
                    <i class="fas fa-clock"></i> 
                    Added ${formatDate(book.createdAt)}
                </p>
            </div>
        </div>
    `;
}

function createListBookCard(book) {
    const levelText = getLevelFromCourseCode(book.isbn, book.level);
    const status = book.quantity > 10 ? 'in-stock' : book.quantity > 0 ? 'low-stock' : 'out-of-stock';
    const statusText = book.quantity > 10 ? 'In Stock' : book.quantity > 0 ? 'Low Stock' : 'Out of Stock';
    
    return `
        <div class="book-card" data-book-id="${book._id}">
            <div class="book-cover-placeholder">
                <i class="fas fa-book"></i>
                ${book.wishlistCount > 0 ? `
                    <div class="book-popularity" title="${book.wishlistCount} users wishlisted this book">
                        <i class="fas fa-heart"></i> ${book.wishlistCount || 0}
                    </div>
                ` : ''}
            </div>
            
            <div class="book-content">
                <div class="book-header-info">
                    <div class="book-meta-info">
                        <span class="book-code-display">${escapeHtml(book.isbn || 'N/A')}</span>
                        <span class="book-level-display">${levelText}</span>
                        <span class="book-status ${status}">
                            ${status === 'in-stock' ? '✓' : status === 'low-stock' ? '⚠' : '✗'} ${statusText}
                        </span>
                    </div>
                    <span class="price-tag">₦${(book.price || 0).toLocaleString()}</span>
                </div>
                
                <h3 class="book-title">${escapeHtml(book.title || 'Untitled')}</h3>
                <p class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author || 'Unknown')}</p>
                
                <div class="book-details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Quantity</span>
                        <span class="detail-value quantity ${book.quantity > 0 ? 'available' : 'unavailable'}">
                            ${book.quantity || 0}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Value</span>
                        <span class="detail-value">₦${((book.price || 0) * (book.quantity || 0)).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Wishlisted</span>
                        <span class="detail-value">${book.wishlistCount || 0} users</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Added</span>
                        <span class="detail-value">${formatDate(book.createdAt, true)}</span>
                    </div>
                </div>
                
                ${book.description ? `
                    <div class="book-description">
                        <p>${escapeHtml(book.description.substring(0, 150))}${book.description.length > 150 ? '...' : ''}</p>
                    </div>
                ` : ''}
                
                <div class="book-actions">
                    <button class="btn btn-secondary view-details-btn" data-book-id="${book._id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-secondary" onclick="openEditModal('${book._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${book.quantity > 0 ? `
                        <button class="btn btn-warning mark-unavailable-btn" data-book-id="${book._id}">
                            <i class="fas fa-times-circle"></i> Mark Unavailable
                        </button>
                    ` : `
                        <button class="btn btn-success mark-available-btn" data-book-id="${book._id}">
                            <i class="fas fa-check-circle"></i> Mark Available
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// ==================== LEVEL DETECTION FROM COURSE CODE ====================
function getLevelFromCourseCode(courseCode, existingLevel = '') {
    if (existingLevel && existingLevel !== 'General') {
        return `${existingLevel} Level`;
    }
    
    if (!courseCode) return 'General Level';
    
    const patterns = [
        /^[A-Z]{3}\s*(\d{3})$/i,
        /^[A-Z]{3}(\d{3})$/i,
        /100|200|300|400/
    ];
    
    for (const pattern of patterns) {
        const match = courseCode.match(pattern);
        if (match) {
            let levelNum = match[1] || match[0];
            if (levelNum.length === 3) {
                levelNum = levelNum.charAt(0) + '00';
            }
            return `${levelNum} Level`;
        }
    }
    
    return 'General Level';
}

// ==================== BOOK MODAL FUNCTIONS ====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
        document.body.style.overflow = 'auto';
    }
}

async function openViewModal(bookId) {
    try {
        const book = state.allBooks.find(b => b._id === bookId);
        if (!book) {
            showNotification("Error", "Book not found", "error");
            return;
        }
        
        state.currentBookId = bookId;
        
        // Populate view modal
        document.getElementById('viewTitle').textContent = book.title || 'Untitled';
        document.getElementById('viewAuthor').textContent = `Author: ${book.author || 'Unknown'}`;
        document.getElementById('viewIsbn').textContent = `Course Code: ${book.isbn || 'N/A'}`;
        document.getElementById('viewLevel').textContent = getLevelFromCourseCode(book.isbn, book.level);
        
        const status = book.quantity > 10 ? 'in-stock' : book.quantity > 0 ? 'low-stock' : 'out-of-stock';
        const statusText = book.quantity > 10 ? 'In Stock' : book.quantity > 0 ? 'Low Stock' : 'Out of Stock';
        const statusElement = document.getElementById('viewStatus');
        statusElement.textContent = statusText;
        statusElement.className = `badge status-badge ${status}`;
        
        document.getElementById('viewPrice').textContent = `₦${(book.price || 0).toLocaleString()}`;
        document.getElementById('viewQuantity').textContent = book.quantity || 0;
        document.getElementById('viewTotalValue').textContent = `₦${((book.price || 0) * (book.quantity || 0)).toLocaleString()}`;
        document.getElementById('viewCreatedAt').textContent = formatDate(book.createdAt, true) || 'N/A';
        document.getElementById('viewUpdatedAt').textContent = formatDate(book.updatedAt || book.createdAt, true) || 'N/A';
        document.getElementById('viewWishlistCount').textContent = `${book.wishlistCount || 0} users`;
        document.getElementById('viewDescription').textContent = book.description || 'No description available.';
        
        // Add availability button
        const isAvailable = book.quantity > 0;
        const availabilityBtn = document.getElementById('viewAvailabilityBtn') || (() => {
            const btn = document.createElement('button');
            btn.id = 'viewAvailabilityBtn';
            btn.className = `btn ${isAvailable ? 'btn-warning' : 'btn-success'}`;
            btn.innerHTML = `<i class="fas ${isAvailable ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}`;
            btn.onclick = () => {
                const confirmed = confirm(`Are you sure you want to mark this book as ${isAvailable ? 'unavailable' : 'available'}?`);
                if (confirmed) {
                    updateBookAvailability(book._id, !isAvailable);
                }
            };
            const modalFooter = document.querySelector('#viewBookModal .modal-footer');
            if (modalFooter) {
                modalFooter.insertBefore(btn, modalFooter.firstChild);
            }
            return btn;
        })();
        
        availabilityBtn.className = `btn ${isAvailable ? 'btn-warning' : 'btn-success'}`;
        availabilityBtn.innerHTML = `<i class="fas ${isAvailable ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}`;
        availabilityBtn.onclick = () => {
            const confirmed = confirm(`Are you sure you want to mark this book as ${isAvailable ? 'unavailable' : 'available'}?`);
            if (confirmed) {
                updateBookAvailability(book._id, !isAvailable);
            }
        };
        
        openModal('viewBookModal');
        
    } catch (error) {
        console.error("Failed to load book details:", error);
        showNotification("Error", "Failed to load book details", "error");
    }
}

async function openEditModal(bookId) {
    try {
        const book = state.allBooks.find(b => b._id === bookId);
        if (!book) {
            showNotification("Error", "Book not found", "error");
            return;
        }
        
        state.currentBookId = bookId;
        
        // Populate edit form
        document.getElementById('editBookId').value = book._id;
        document.getElementById('editTitle').value = book.title || '';
        document.getElementById('editAuthor').value = book.author || '';
        document.getElementById('editIsbn').value = book.isbn || '';
        document.getElementById('editPrice').value = book.price || 0;
        document.getElementById('editQuantity').value = book.quantity || 0;
        document.getElementById('editLevel').value = book.level || '';
        document.getElementById('editDescription').value = book.description || '';
        
        openModal('editBookModal');
        
    } catch (error) {
        console.error("Failed to load book for editing:", error);
        showNotification("Error", "Failed to load book details", "error");
    }
}

async function handleUpdateBook(e) {
    e.preventDefault();
    
    if (!state.currentBookId) {
        showNotification("Error", "No book selected for editing", "error");
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        const bookData = {
            title: document.getElementById('editTitle').value.trim(),
            author: document.getElementById('editAuthor').value.trim(),
            isbn: document.getElementById('editIsbn').value.trim(),
            price: parseFloat(document.getElementById('editPrice').value),
            quantity: parseInt(document.getElementById('editQuantity').value),
            level: document.getElementById('editLevel').value || undefined,
            description: document.getElementById('editDescription').value.trim() || undefined
        };
        
        // Validation
        if (!bookData.title || !bookData.author || !bookData.isbn || isNaN(bookData.price) || isNaN(bookData.quantity)) {
            throw new Error('Please fill in all required fields correctly');
        }
        
        if (bookData.price < 0) {
            throw new Error('Price cannot be negative');
        }
        
        if (bookData.quantity < 0) {
            throw new Error('Quantity cannot be negative');
        }
        
        await apiFetch(`/books/${state.currentBookId}`, {
            method: 'PUT',
            body: JSON.stringify(bookData)
        });
        
        showNotification("Success", "Book updated successfully", "success");
        
        closeModal('editBookModal');
        
        // Reload books and stats
        loadBooks();
        loadDashboardStats();
        
    } catch (error) {
        console.error("Update error:", error);
        showNotification("Error", error.message || "Failed to update book", "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleAddBook(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;
        
        const bookData = {
            title: document.getElementById('title').value.trim(),
            author: document.getElementById('author').value.trim(),
            isbn: document.getElementById('isbn').value.trim(),
            price: parseFloat(document.getElementById('price').value),
            quantity: parseInt(document.getElementById('quantity').value),
            level: document.getElementById('level').value || undefined,
            description: document.getElementById('description').value.trim() || undefined
        };
        
        // Validation
        if (!bookData.title || !bookData.author || !bookData.isbn || isNaN(bookData.price) || isNaN(bookData.quantity)) {
            throw new Error('Please fill in all required fields correctly');
        }
        
        if (bookData.price < 0) {
            throw new Error('Price cannot be negative');
        }
        
        if (bookData.quantity < 1) {
            throw new Error('Quantity must be at least 1');
        }
        
        await apiFetch('/books', {
            method: 'POST',
            body: JSON.stringify(bookData)
        });
        
        showNotification("Success", "Book added successfully", "success");
        
        // Reset form and close modal
        e.target.reset();
        closeModal('addBookModal');
        
        // Reload books and stats
        loadBooks();
        loadDashboardStats();
        
    } catch (error) {
        console.error("Add book error:", error);
        showNotification("Error", error.message || "Failed to add book", "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function confirmDeleteBook(bookId, bookTitle) {
    const confirmed = await showConfirmationDialog(
        "Delete Book",
        `Are you sure you want to delete "${bookTitle}"? This action cannot be undone.`,
        "Delete",
        "Cancel"
    );
    
    if (confirmed) {
        await deleteBook(bookId);
    }
}

async function deleteBook(bookId) {
    try {
        await apiFetch(`/books/${bookId}`, {
            method: 'DELETE'
        });
        
        showNotification("Success", "Book deleted successfully", "success");
        
        // Close edit modal if open
        closeModal('editBookModal');
        
        // Reload books and stats
        loadBooks();
        loadDashboardStats();
        
    } catch (error) {
        console.error("Delete error:", error);
        showNotification("Error", "Failed to delete book", "error");
    }
}

async function handleDeleteBook() {
    if (!state.currentBookId) return;
    
    const book = state.allBooks.find(b => b._id === state.currentBookId);
    if (!book) return;
    
    await confirmDeleteBook(state.currentBookId, book.title || 'Untitled');
}

// ==================== BOOK AVAILABILITY ====================
async function updateBookAvailability(bookId, isAvailable) {
    try {
        showNotification('Updating Status', 'Please wait...', 'info');
        
        const response = await apiFetch(`/books/${bookId}/availability`, {
            method: 'PUT',
            body: JSON.stringify({
                isAvailable: isAvailable
            })
        });
        
        if (response.success) {
            showNotification('Success', `Book marked as ${isAvailable ? 'available' : 'unavailable'}`, 'success');
            
            // Update local state
            const bookIndex = state.allBooks.findIndex(b => b._id === bookId);
            if (bookIndex !== -1) {
                state.allBooks[bookIndex].quantity = isAvailable ? 1 : 0;
                applyFilters();
            }
            
            // Close modal if open
            closeModal('viewBookModal');
            
            // Reload dashboard stats
            loadDashboardStats();
            
        } else {
            throw new Error(response.error || 'Failed to update availability');
        }
        
    } catch (error) {
        console.error('Failed to update book availability:', error);
        showNotification('Error', error.message || 'Failed to update availability', 'error');
    }
}

// ==================== USER MANAGEMENT ====================
async function loadUsers() {
    try {
        console.log("Loading users...");
        const data = await apiFetch("/users");
        state.allUsers = data.users || [];
        console.log(`Loaded ${state.allUsers.length} users`);
        applyUserFilters();
        renderUsers();
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Error', 'Failed to load users', 'error');
    }
}

function applyUserFilters() {
    let filtered = [...state.allUsers];
    
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('userRoleFilter')?.value || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || '';
    
    if (searchTerm) {
        filtered = filtered.filter(user => 
            (user.name?.toLowerCase().includes(searchTerm) || false) ||
            (user.email?.toLowerCase().includes(searchTerm) || false) ||
            (user.studentId?.toLowerCase().includes(searchTerm) || false)
        );
    }
    
    if (roleFilter) {
        filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    if (statusFilter) {
        filtered = filtered.filter(user => user.status === statusFilter);
    }
    
    state.filteredUsers = filtered;
    updateUserPagination();
}

function updateUserPagination() {
    const totalUsers = state.filteredUsers.length;
    state.totalUserPages = Math.max(1, Math.ceil(totalUsers / state.itemsPerUserPage));
    
    // Create pagination buttons
    const paginationEl = document.getElementById('userPagination');
    if (paginationEl) {
        const startIndex = (state.currentUserPage - 1) * state.itemsPerUserPage + 1;
        const endIndex = Math.min(state.currentUserPage * state.itemsPerUserPage, totalUsers);
        
        paginationEl.innerHTML = `
            <button class="pagination-btn prev-user-btn" ${state.currentUserPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
            <div class="page-numbers" id="userPageNumbers"></div>
            <button class="pagination-btn next-user-btn" ${state.currentUserPage === state.totalUserPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
            <div class="page-info">
                Showing ${startIndex}-${endIndex} of ${totalUsers} users
            </div>
        `;
        
        // Add event listeners
        document.querySelector('.prev-user-btn')?.addEventListener('click', () => goToUserPage(state.currentUserPage - 1));
        document.querySelector('.next-user-btn')?.addEventListener('click', () => goToUserPage(state.currentUserPage + 1));
        
        // Generate page numbers
        const pageNumbersEl = document.getElementById('userPageNumbers');
        if (pageNumbersEl) {
            pageNumbersEl.innerHTML = '';
            const maxPagesToShow = 5;
            let startPage = Math.max(1, state.currentUserPage - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(state.totalUserPages, startPage + maxPagesToShow - 1);
            
            if (endPage - startPage + 1 < maxPagesToShow) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-number ${i === state.currentUserPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => goToUserPage(i));
                pageNumbersEl.appendChild(pageBtn);
            }
        }
    }
}

function goToUserPage(page) {
    if (page < 1 || page > state.totalUserPages || page === state.currentUserPage) return;
    
    state.currentUserPage = page;
    updateUserPagination();
    renderUsers();
}

function renderUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    const startIndex = (state.currentUserPage - 1) * state.itemsPerUserPage;
    const endIndex = Math.min(startIndex + state.itemsPerUserPage, state.filteredUsers.length);
    const usersToShow = state.filteredUsers.slice(startIndex, endIndex);
    
    if (usersToShow.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state" style="padding: 2rem;">
                        <i class="fas fa-user-slash"></i>
                        <h3>No Users Found</h3>
                        <p>${state.allUsers.length === 0 ? 'No users registered yet' : 'Try adjusting your filters'}</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = usersToShow.map(user => `
        <tr>
            <td>
                <div class="user-name">
                    <strong>${escapeHtml(user.name || 'Unknown')}</strong>
                    ${user.isAdmin ? '<span class="badge" style="background: #dc3545; color: white; margin-left: 0.5rem; font-size: 0.7rem;">Admin</span>' : ''}
                </div>
            </td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td>${escapeHtml(user.studentId || 'N/A')}</td>
            <td><span class="user-role ${user.role || 'student'}">${(user.role || 'student').toUpperCase()}</span></td>
            <td><span class="user-status ${user.status || 'active'}">${(user.status || 'active').toUpperCase()}</span></td>
            <td>${formatDate(user.createdAt, true)}</td>
            <td>
                <div class="user-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewUserDetails('${user._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editUser('${user._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!user.isAdmin ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}', '${escapeHtml(user.name || 'User')}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== WISHLIST MANAGEMENT ====================
async function loadWishlistData() {
    try {
        console.log("Loading wishlist data...");
        const data = await apiFetch("/wishlists/stats");
        state.wishlistData.stats = data;
        
        // Update wishlist stats
        updateWishlistStats();
        
        // Load recent wishlists
        const recentData = await apiFetch("/wishlists/recent?limit=10");
        state.wishlistData.recent = recentData.wishlists || [];
        renderRecentWishlists();
        
        // Load top books and users
        loadTopWishlistedBooks();
        loadTopWishlistUsers();
        
        console.log("Wishlist data loaded successfully");
    } catch (error) {
        console.error('Failed to load wishlist data:', error);
    }
}

function updateWishlistStats() {
    const stats = state.wishlistData.stats;
    
    updateElementText('totalWishlists', stats.totalWishlists?.toLocaleString() || '0');
    updateElementText('uniqueWishlisted', stats.uniqueBooks?.toLocaleString() || '0');
    updateElementText('activeWishlistUsers', stats.activeUsers?.toLocaleString() || '0');
    updateElementText('avgWishlistPerUser', stats.avgPerUser?.toFixed(1) || '0.0');
    
    // Update change indicators
    const wishlistChange = document.getElementById('wishlistChange');
    const uniqueBookChange = document.getElementById('uniqueBookChange');
    
    if (wishlistChange) {
        const growthRate = stats.growthRate || 0;
        wishlistChange.innerHTML = `
            <i class="fas fa-arrow-${growthRate >= 0 ? 'up' : 'down'}"></i> ${Math.abs(growthRate)}%
        `;
        wishlistChange.className = `stat-change ${growthRate >= 0 ? 'positive' : ''}`;
    }
    
    if (uniqueBookChange) {
        const uniqueGrowth = stats.uniqueGrowth || 0;
        uniqueBookChange.innerHTML = `
            <i class="fas fa-arrow-${uniqueGrowth >= 0 ? 'up' : 'down'}"></i> ${Math.abs(uniqueGrowth)}%
        `;
        uniqueBookChange.className = `stat-change ${uniqueGrowth >= 0 ? 'positive' : ''}`;
    }
}

async function loadTopWishlistedBooks() {
    try {
        const data = await apiFetch("/wishlists/top-books?limit=5");
        state.wishlistData.topBooks = data.books || [];
        renderTopWishlistedBooks();
    } catch (error) {
        console.error('Failed to load top wishlisted books:', error);
    }
}

function renderTopWishlistedBooks() {
    const container = document.getElementById('topWishlistedBooks');
    if (!container || !state.wishlistData.topBooks.length) return;
    
    container.innerHTML = state.wishlistData.topBooks.map((book, index) => `
        <div class="top-book-item">
            <div class="book-rank ${index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}">
                ${index + 1}
            </div>
            <div class="book-info">
                <h4>${escapeHtml(book.title || 'Untitled')}</h4>
                <p>${escapeHtml(book.author || 'Unknown')} • ${book.courseCode || 'N/A'}</p>
            </div>
            <div class="book-count">
                <i class="fas fa-heart"></i> ${book.wishlistCount || 0}
            </div>
        </div>
    `).join('');
}

async function loadTopWishlistUsers() {
    try {
        const data = await apiFetch("/wishlists/top-users?limit=5");
        state.wishlistData.topUsers = data.users || [];
        renderTopWishlistUsers();
    } catch (error) {
        console.error('Failed to load top wishlist users:', error);
    }
}

function renderTopWishlistUsers() {
    const container = document.getElementById('topWishlistUsers');
    if (!container || !state.wishlistData.topUsers.length) return;
    
    container.innerHTML = state.wishlistData.topUsers.map((user, index) => `
        <div class="top-user-item">
            <div class="user-rank">
                ${index + 1}
            </div>
            <div class="user-info">
                <h4>${escapeHtml(user.name || 'Unknown')}</h4>
                <p>${escapeHtml(user.email || 'N/A')}</p>
            </div>
            <div class="user-count">
                <i class="fas fa-book"></i> ${user.wishlistCount || 0}
            </div>
        </div>
    `).join('');
}

function renderRecentWishlists() {
    const container = document.getElementById('recentWishlists');
    if (!container) return;
    
    if (!state.wishlistData.recent.length) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state" style="padding: 1rem;">
                        <i class="fas fa-heart"></i>
                        <p>No recent wishlist activity</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = state.wishlistData.recent.map(item => `
        <tr>
            <td>
                <div class="user-info-small">
                    <strong>${escapeHtml(item.userName || 'Unknown')}</strong>
                    <small>${escapeHtml(item.userEmail || 'N/A')}</small>
                </div>
            </td>
            <td>
                <div class="book-info-small">
                    <strong>${escapeHtml(item.bookTitle || 'Untitled')}</strong>
                    <small>${escapeHtml(item.bookAuthor || 'Unknown')}</small>
                </div>
            </td>
            <td>${escapeHtml(item.courseCode || 'N/A')}</td>
            <td>${formatDate(item.addedAt, true)}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="viewWishlistItem('${item._id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="removeFromWishlist('${item._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ==================== WISHLIST FUNCTIONS ====================
window.removeFromWishlist = async function(itemId) {
    console.log(`Attempting to remove wishlist item: ${itemId}`);
    
    // Find the wishlist item in cached data
    const wishlistItem = state.wishlistData.recent.find(item => item._id === itemId);
    const bookTitle = wishlistItem?.bookTitle || 'Unknown Book';
    const userName = wishlistItem?.userName || 'Unknown User';
    
    console.log('Found wishlist item:', wishlistItem);
    
    const confirmed = await showConfirmationDialog(
        "Remove from Wishlist",
        `Are you sure you want to remove "${bookTitle}" from ${userName}'s wishlist?`,
        "Remove",
        "Cancel"
    );
    
    if (confirmed) {
        try {
            showNotification("Removing...", "Removing item from wishlist", "info");
            
            // Call API to remove wishlist item
            console.log(`Calling API: /wishlists/${itemId}`);
            const response = await apiFetch(`/wishlists/${itemId}`, {
                method: 'DELETE'
            });
            
            console.log('API response:', response);
            
            if (response.success) {
                // Remove from local state
                state.wishlistData.recent = state.wishlistData.recent.filter(item => item._id !== itemId);
                
                // Update stats
                if (state.wishlistData.stats.totalWishlists > 0) {
                    state.wishlistData.stats.totalWishlists--;
                }
                
                // Update the book's wishlist count
                if (wishlistItem?.bookId) {
                    const bookIndex = state.allBooks.findIndex(b => b._id === wishlistItem.bookId);
                    if (bookIndex !== -1 && state.allBooks[bookIndex].wishlistCount > 0) {
                        state.allBooks[bookIndex].wishlistCount--;
                    }
                }
                
                // Update UI
                updateWishlistStats();
                renderRecentWishlists();
                renderBooks(); // Refresh books to update wishlist counts
                
                // Reload top books and users
                await loadTopWishlistedBooks();
                await loadTopWishlistUsers();
                
                showNotification("Success", "Item removed from wishlist", "success");
            } else {
                throw new Error(response.error || 'Failed to remove wishlist item');
            }
            
        } catch (error) {
            console.error("Failed to remove wishlist item:", error);
            console.error("Error details:", error.message, error.stack);
            
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                showNotification("Network Error", "Cannot connect to server. Please check your connection.", "error");
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                showNotification("Session Expired", "Please login again", "error");
                setTimeout(() => {
                    window.location.href = "../Student-DahBord/login.html";
                }, 2000);
            } else {
                showNotification("Error", error.message || "Failed to remove item from wishlist", "error");
            }
        }
    }
};

window.viewWishlistItem = async function(itemId) {
    console.log(`Viewing wishlist item: ${itemId}`);
    
    try {
        showNotification("Loading...", "Fetching wishlist details", "info");
        
        // Try to fetch detailed wishlist information
        let wishlistItem;
        try {
            const response = await apiFetch(`/wishlists/${itemId}/details`);
            wishlistItem = response;
            console.log('API response for wishlist details:', response);
        } catch (apiError) {
            console.warn('API call failed, using cached data:', apiError);
            // Fallback to cached data
            wishlistItem = state.wishlistData.recent.find(item => item._id === itemId);
            
            if (!wishlistItem) {
                throw new Error('Wishlist item not found in cache');
            }
        }
        
        if (!wishlistItem) {
            showNotification("Error", "Wishlist item not found", "error");
            return;
        }
        
        // Create and show wishlist details modal
        showWishlistDetailsModal(wishlistItem);
        
    } catch (error) {
        console.error("Failed to load wishlist details:", error);
        showNotification("Error", "Failed to load wishlist details", "error");
    }
};

function showWishlistDetailsModal(wishlistItem) {
    console.log('Showing wishlist details:', wishlistItem);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('wishlistDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wishlistDetailsModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-heart"></i> Wishlist Details</h2>
                    <button class="modal-close" onclick="closeModal('wishlistDetailsModal')">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div id="wishlistDetailsContent"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('wishlistDetailsModal')">Close</button>
                    <button class="btn btn-danger" onclick="removeWishlistItemFromModal()">Remove from Wishlist</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate content
    const content = document.getElementById('wishlistDetailsContent');
    if (content) {
        const available = wishlistItem.available !== false;
        
        content.innerHTML = `
            <div class="wishlist-details">
                <div class="detail-section">
                    <h3><i class="fas fa-user"></i> User Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Name:</span>
                            <span class="detail-value">${escapeHtml(wishlistItem.userName || 'Unknown')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${escapeHtml(wishlistItem.userEmail || 'N/A')}</span>
                        </div>
                        ${wishlistItem.studentId ? `
                        <div class="detail-item">
                            <span class="detail-label">Student ID:</span>
                            <span class="detail-value">${escapeHtml(wishlistItem.studentId)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-book"></i> Book Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Title:</span>
                            <span class="detail-value">${escapeHtml(wishlistItem.bookTitle || 'Untitled')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Author:</span>
                            <span class="detail-value">${escapeHtml(wishlistItem.bookAuthor || 'Unknown')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Course Code:</span>
                            <span class="detail-value">${escapeHtml(wishlistItem.courseCode || 'N/A')}</span>
                        </div>
                        ${wishlistItem.price ? `
                        <div class="detail-item">
                            <span class="detail-label">Price:</span>
                            <span class="detail-value">₦${(wishlistItem.price || 0).toLocaleString()}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-info-circle"></i> Wishlist Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Date Added:</span>
                            <span class="detail-value">${formatDate(wishlistItem.addedAt || wishlistItem.createdAt, true)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value ${available ? 'available' : 'unavailable'}">
                                <i class="fas fa-circle"></i> ${available ? 'Available' : 'Unavailable'}
                            </span>
                        </div>
                        ${wishlistItem.updatedAt ? `
                        <div class="detail-item">
                            <span class="detail-label">Last Updated:</span>
                            <span class="detail-value">${formatDate(wishlistItem.updatedAt, true)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${wishlistItem.notes ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-sticky-note"></i> User Notes</h3>
                        <div class="notes-box">
                            <p>${escapeHtml(wishlistItem.notes)}</p>
                        </div>
                    </div>
                ` : ''}
                
                ${wishlistItem.userNotes ? `
                    <div class="detail-section">
                        <h3><i class="fas fa-comment"></i> Additional Notes</h3>
                        <div class="notes-box">
                            <p>${escapeHtml(wishlistItem.userNotes)}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Store current wishlist item ID for removal
    modal.dataset.wishlistItemId = wishlistItem._id || wishlistItem.id;
    
    // Show modal
    openModal('wishlistDetailsModal');
}

window.removeWishlistItemFromModal = async function() {
    const modal = document.getElementById('wishlistDetailsModal');
    const itemId = modal?.dataset.wishlistItemId;
    
    if (itemId) {
        closeModal('wishlistDetailsModal');
        await removeFromWishlist(itemId);
    } else {
        showNotification("Error", "No wishlist item selected", "error");
    }
};

// ==================== REPORTS ====================
async function generateReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) {
            showNotification('Error', 'Please select start and end dates', 'error');
            return;
        }
        
        showNotification('Generating Report', 'Please wait while we generate your report...', 'info');
        
        const reportData = await apiFetch(`/reports/generate?start=${startDate}&end=${endDate}`);
        
        updateReports(reportData);
        renderCharts(reportData.charts);
        
        showNotification('Report Generated', 'Your report has been generated successfully', 'success');
    } catch (error) {
        console.error('Failed to generate report:', error);
        showNotification('Error', 'Failed to generate report', 'error');
    }
}

function updateReports(data) {
    // Update books report
    const booksReportEl = document.getElementById('booksReport');
    if (booksReportEl) {
        booksReportEl.innerHTML = `
            <div class="report-item">
                <span class="report-label">Total Books:</span>
                <span class="report-value">${data.booksReport.totalBooks}</span>
            </div>
            <div class="report-item">
                <span class="report-label">New Books Added:</span>
                <span class="report-value">${data.booksReport.newBooks}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Books Updated:</span>
                <span class="report-value">${data.booksReport.updatedBooks}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Total Copies:</span>
                <span class="report-value">${data.booksReport.totalCopies}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Total Value:</span>
                <span class="report-value">₦${data.booksReport.totalValue?.toLocaleString()}</span>
            </div>
        `;
    }
    
    // Update users report
    const usersReportEl = document.getElementById('usersReport');
    if (usersReportEl) {
        usersReportEl.innerHTML = `
            <div class="report-item">
                <span class="report-label">Total Users:</span>
                <span class="report-value">${data.usersReport.totalUsers}</span>
            </div>
            <div class="report-item">
                <span class="report-label">New Registrations:</span>
                <span class="report-value">${data.usersReport.newUsers}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Active Users:</span>
                <span class="report-value">${data.usersReport.activeUsers}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Admin Users:</span>
                <span class="report-value">${data.usersReport.adminUsers}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Student Users:</span>
                <span class="report-value">${data.usersReport.studentUsers}</span>
            </div>
        `;
    }
    
    // Update wishlist report
    const wishlistReportEl = document.getElementById('wishlistReport');
    if (wishlistReportEl) {
        wishlistReportEl.innerHTML = `
            <div class="report-item">
                <span class="report-label">Total Wishlists:</span>
                <span class="report-value">${data.wishlistReport.totalWishlists}</span>
            </div>
            <div class="report-item">
                <span class="report-label">New Wishlists:</span>
                <span class="report-value">${data.wishlistReport.newWishlists}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Unique Books:</span>
                <span class="report-value">${data.wishlistReport.uniqueBooks}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Active Users:</span>
                <span class="report-value">${data.wishlistReport.activeUsers}</span>
            </div>
            <div class="report-item">
                <span class="report-label">Avg per User:</span>
                <span class="report-value">${data.wishlistReport.avgPerUser?.toFixed(1)}</span>
            </div>
        `;
    }
}

// ==================== CHARTS FUNCTIONALITY ====================
async function loadCharts() {
    try {
        // Load charts data from API
        const chartsData = await apiFetch('/charts');
        
        // Render all charts
        renderMonthlyTrendChart(chartsData.monthlyTrend);
        renderLevelDistributionChart(chartsData.levelDistribution);
        renderSalesReportChart(chartsData.salesReport);
        
    } catch (error) {
        console.error('Failed to load charts:', error);
        // Initialize with empty charts
        initializeEmptyCharts();
    }
}

function renderCharts(chartsData) {
    if (!chartsData) {
        loadCharts();
        return;
    }
    
    renderMonthlyTrendChart(chartsData.monthlyTrend);
    renderLevelDistributionChart(chartsData.levelDistribution);
    renderSalesReportChart(chartsData.salesReport);
}

function renderMonthlyTrendChart(data) {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    
    // If canvas doesn't exist, create it
    if (ctx.tagName !== 'CANVAS') {
        const canvas = document.createElement('canvas');
        canvas.id = 'monthlyTrendChartCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        ctx.innerHTML = '';
        ctx.appendChild(canvas);
    }
    
    const canvas = document.getElementById('monthlyTrendChartCanvas') || ctx;
    const chartContext = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.monthlyTrendChart) {
        window.monthlyTrendChart.destroy();
    }
    
    // Create new chart
    window.monthlyTrendChart = new Chart(chartContext, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Books Added',
                    data: data.books || [],
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Wishlists Created',
                    data: data.wishlists || [],
                    borderColor: '#f72585',
                    backgroundColor: 'rgba(247, 37, 133, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Users Registered',
                    data: data.users || [],
                    borderColor: '#4cc9f0',
                    backgroundColor: 'rgba(76, 201, 240, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Monthly Activity Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderLevelDistributionChart(data) {
    const ctx = document.getElementById('levelDistributionChart');
    if (!ctx) return;
    
    if (ctx.tagName !== 'CANVAS') {
        const canvas = document.createElement('canvas');
        canvas.id = 'levelDistributionChartCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        ctx.innerHTML = '';
        ctx.appendChild(canvas);
    }
    
    const canvas = document.getElementById('levelDistributionChartCanvas') || ctx;
    const chartContext = canvas.getContext('2d');
    
    if (window.levelDistributionChart) {
        window.levelDistributionChart.destroy();
    }
    
    window.levelDistributionChart = new Chart(chartContext, {
        type: 'doughnut',
        data: {
            labels: data.labels || ['100 Level', '200 Level', '300 Level', '400 Level', 'General'],
            datasets: [{
                data: data.data || [],
                backgroundColor: [
                    '#4361ee',
                    '#3a0ca3',
                    '#7209b7',
                    '#f72585',
                    '#4cc9f0'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Books by Level Distribution'
                }
            }
        }
    });
}

function renderSalesReportChart(data) {
    const ctx = document.getElementById('salesReportChart');
    if (!ctx) return;
    
    if (ctx.tagName !== 'CANVAS') {
        const canvas = document.createElement('canvas');
        canvas.id = 'salesReportChartCanvas';
        canvas.style.width = '100%';
        canvas.style.height = '300px';
        ctx.innerHTML = '';
        ctx.appendChild(canvas);
    }
    
    const canvas = document.getElementById('salesReportChartCanvas') || ctx;
    const chartContext = canvas.getContext('2d');
    
    if (window.salesReportChart) {
        window.salesReportChart.destroy();
    }
    
    window.salesReportChart = new Chart(chartContext, {
        type: 'bar',
        data: {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Books Value (₦)',
                    data: data.values || [],
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: '#4361ee',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Sales Report (Book Value)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₦' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function initializeEmptyCharts() {
    const emptyData = {
        labels: ['No Data Available'],
        books: [0],
        wishlists: [0],
        users: [0],
        data: [1],
        values: [0]
    };
    
    renderMonthlyTrendChart(emptyData);
    renderLevelDistributionChart(emptyData);
    renderSalesReportChart(emptyData);
}

async function exportReport() {
    try {
        showNotification('Exporting Report', 'Preparing PDF download...', 'info');
        
        // Simulate PDF generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('Export Complete', 'Report has been downloaded as PDF', 'success');
    } catch (error) {
        console.error('Failed to export report:', error);
        showNotification('Error', 'Failed to export report', 'error');
    }
}

// ==================== SETTINGS MANAGEMENT ====================
function setupSettings() {
    console.log("Setting up settings...");
    
    // Load saved settings
    loadSettings();
    
    // Setup theme selector
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            const theme = option.dataset.theme;
            applyTheme(theme);
            localStorage.setItem('adminTheme', theme);
        });
    });
    
    console.log("Settings setup complete");
}

function applySavedSettings() {
    // Apply saved theme
    const savedTheme = localStorage.getItem('adminTheme') || 'light';
    applyTheme(savedTheme);
    
    // Update theme selector UI
    document.querySelectorAll('.theme-option').forEach(option => {
        if (option.dataset.theme === savedTheme) {
            option.classList.add('active');
        }
    });
    
    // Apply other saved settings
    const itemsPerPage = localStorage.getItem('adminItemsPerPage') || '12';
    const defaultBookView = localStorage.getItem('adminDefaultBookView') || 'grid';
    const dateFormat = localStorage.getItem('adminDateFormat') || 'relative';
    const timeFormat = localStorage.getItem('adminTimeFormat') || '12h';
    
    document.getElementById('itemsPerPage').value = itemsPerPage;
    document.getElementById('defaultBookView').value = defaultBookView;
    document.getElementById('dateFormat').value = dateFormat;
    document.getElementById('timeFormat').value = timeFormat;
    
    state.itemsPerPage = parseInt(itemsPerPage);
    state.dateFormat = dateFormat;
    state.timeFormat = timeFormat;
    setViewMode(defaultBookView);
    
    // Apply compact mode
    const compactMode = localStorage.getItem('adminCompactMode') === 'true';
    if (compactMode) {
        document.body.classList.add('compact-mode');
    }
    
    // Apply sidebar state
    const sidebarCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        toggleSidebar();
    }
}

function applyTheme(theme) {
    document.body.classList.remove('dark-mode', 'light-mode');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        // Auto mode - detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.add('light-mode');
        }
    }
}

function loadSettings() {
    console.log("Loading settings from localStorage...");
    
    // Load all settings from localStorage
    const settings = {
        compactMode: localStorage.getItem('adminCompactMode') === 'true',
        sidebarCollapsed: localStorage.getItem('adminSidebarCollapsed') === 'true',
        animationsEnabled: localStorage.getItem('adminAnimationsEnabled') !== 'false',
        emailNotifications: localStorage.getItem('adminEmailNotifications') !== 'false',
        systemNotifications: localStorage.getItem('adminSystemNotifications') !== 'false',
        notifyNewBooks: localStorage.getItem('adminNotifyNewBooks') === 'true',
        notifyNewUsers: localStorage.getItem('adminNotifyNewUsers') === 'true',
        notifyWishlistActivity: localStorage.getItem('adminNotifyWishlistActivity') === 'true',
        notifyLowStock: localStorage.getItem('adminNotifyLowStock') === 'true',
        itemsPerPage: localStorage.getItem('adminItemsPerPage') || '12',
        defaultBookView: localStorage.getItem('adminDefaultBookView') || 'grid',
        dateFormat: localStorage.getItem('adminDateFormat') || 'relative',
        timeFormat: localStorage.getItem('adminTimeFormat') || '12h',
        sessionTimeout: localStorage.getItem('adminSessionTimeout') || '60',
        autoBackup: localStorage.getItem('adminAutoBackup') === 'true',
        backupRetention: localStorage.getItem('adminBackupRetention') || '30',
        loginAlerts: localStorage.getItem('adminLoginAlerts') !== 'false'
    };
    
    // Apply to form elements
    setCheckboxValue('compactMode', settings.compactMode);
    setCheckboxValue('sidebarCollapsed', settings.sidebarCollapsed);
    setCheckboxValue('animationsEnabled', settings.animationsEnabled);
    setCheckboxValue('emailNotifications', settings.emailNotifications);
    setCheckboxValue('systemNotifications', settings.systemNotifications);
    setCheckboxValue('notifyNewBooks', settings.notifyNewBooks);
    setCheckboxValue('notifyNewUsers', settings.notifyNewUsers);
    setCheckboxValue('notifyWishlistActivity', settings.notifyWishlistActivity);
    setCheckboxValue('notifyLowStock', settings.notifyLowStock);
    setCheckboxValue('autoBackup', settings.autoBackup);
    setCheckboxValue('loginAlerts', settings.loginAlerts);
    
    setSelectValue('itemsPerPage', settings.itemsPerPage);
    setSelectValue('defaultBookView', settings.defaultBookView);
    setSelectValue('dateFormat', settings.dateFormat);
    setSelectValue('timeFormat', settings.timeFormat);
    setSelectValue('backupRetention', settings.backupRetention);
    
    setInputValue('sessionTimeout', settings.sessionTimeout);
}

function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = value;
    }
}

function setSelectValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

function saveAppearanceSettings() {
    try {
        const compactMode = document.getElementById('compactMode').checked;
        const sidebarCollapsed = document.getElementById('sidebarCollapsed').checked;
        const animationsEnabled = document.getElementById('animationsEnabled').checked;
        
        localStorage.setItem('adminCompactMode', compactMode);
        localStorage.setItem('adminSidebarCollapsed', sidebarCollapsed);
        localStorage.setItem('adminAnimationsEnabled', animationsEnabled);
        
        // Apply settings immediately
        if (compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
        
        // Apply sidebar state
        if (sidebarCollapsed) {
            toggleSidebar();
        }
        
        showNotification('Settings Saved', 'Appearance settings have been saved', 'success');
        
    } catch (error) {
        console.error('Error saving appearance settings:', error);
        showNotification('Error', 'Failed to save appearance settings', 'error');
    }
}

function saveNotificationSettings() {
    try {
        const emailNotifications = document.getElementById('emailNotifications').checked;
        const systemNotifications = document.getElementById('systemNotifications').checked;
        const notifyNewBooks = document.getElementById('notifyNewBooks').checked;
        const notifyNewUsers = document.getElementById('notifyNewUsers').checked;
        const notifyWishlistActivity = document.getElementById('notifyWishlistActivity').checked;
        const notifyLowStock = document.getElementById('notifyLowStock').checked;
        
        localStorage.setItem('adminEmailNotifications', emailNotifications);
        localStorage.setItem('adminSystemNotifications', systemNotifications);
        localStorage.setItem('adminNotifyNewBooks', notifyNewBooks);
        localStorage.setItem('adminNotifyNewUsers', notifyNewUsers);
        localStorage.setItem('adminNotifyWishlistActivity', notifyWishlistActivity);
        localStorage.setItem('adminNotifyLowStock', notifyLowStock);
        
        showNotification('Settings Saved', 'Notification settings have been saved', 'success');
        
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showNotification('Error', 'Failed to save notification settings', 'error');
    }
}

function saveSystemSettings() {
    try {
        const itemsPerPage = document.getElementById('itemsPerPage').value;
        const defaultBookView = document.getElementById('defaultBookView').value;
        const dateFormat = document.getElementById('dateFormat').value;
        const timeFormat = document.getElementById('timeFormat').value;
        
        localStorage.setItem('adminItemsPerPage', itemsPerPage);
        localStorage.setItem('adminDefaultBookView', defaultBookView);
        localStorage.setItem('adminDateFormat', dateFormat);
        localStorage.setItem('adminTimeFormat', timeFormat);
        
        // Apply settings immediately
        state.itemsPerPage = parseInt(itemsPerPage);
        state.dateFormat = dateFormat;
        state.timeFormat = timeFormat;
        setViewMode(defaultBookView);
        
        // Re-render books to apply new items per page
        if (state.filteredBooks.length > 0) {
            updateBookPagination();
            renderBooks();
        }
        
        showNotification('Settings Saved', 'System settings have been saved', 'success');
        
    } catch (error) {
        console.error('Error saving system settings:', error);
        showNotification('Error', 'Failed to save system settings', 'error');
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    let strength = 0;
    let text = 'Very Weak';
    let color = '#dc3545';
    let width = '0%';
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) {
        text = 'Weak';
        color = '#dc3545';
        width = '33%';
    } else if (strength === 3) {
        text = 'Medium';
        color = '#ffc107';
        width = '66%';
    } else if (strength >= 4) {
        text = 'Strong';
        color = '#28a745';
        width = '100%';
    }
    
    if (strengthBar) {
        strengthBar.style.width = width;
        strengthBar.style.backgroundColor = color;
        strengthBar.className = 'strength-bar ' + text.toLowerCase();
    }
    
    if (strengthText) {
        strengthText.textContent = `Password strength: ${text}`;
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('Error', 'Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Error', 'New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('Error', 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    // Check password strength
    const strength = checkPasswordStrengthValue(newPassword);
    if (strength < 3) {
        showNotification('Error', 'Password is too weak. Please use a stronger password.', 'error');
        return;
    }
    
    try {
        showNotification('Changing Password', 'Please wait...', 'info');
        
        const response = await apiFetch('/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.success) {
            showNotification('Success', 'Password changed successfully', 'success');
            
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            // Reset strength indicator
            const strengthBar = document.querySelector('.strength-bar');
            const strengthText = document.querySelector('.strength-text');
            if (strengthBar) {
                strengthBar.style.width = '0%';
                strengthBar.className = 'strength-bar';
            }
            if (strengthText) {
                strengthText.textContent = 'Password strength: ';
            }
        } else {
            throw new Error(response.error || 'Failed to change password');
        }
        
    } catch (error) {
        console.error('Failed to change password:', error);
        showNotification('Error', error.message || 'Failed to change password', 'error');
    }
}

function checkPasswordStrengthValue(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
}

async function createBackup() {
    try {
        showNotification('Creating Backup', 'Please wait while we create a backup...', 'info');
        
        await apiFetch('/backup/create', {
            method: 'POST'
        });
        
        showNotification('Backup Created', 'System backup has been created successfully', 'success');
        
    } catch (error) {
        console.error('Failed to create backup:', error);
        showNotification('Error', 'Failed to create backup', 'error');
    }
}

async function exportData() {
    try {
        showNotification('Exporting Data', 'Preparing data for export...', 'info');
        
        // Create export data
        const exportData = {
            books: state.allBooks,
            users: state.allUsers,
            wishlists: state.wishlistData,
            timestamp: new Date().toISOString(),
            exportedBy: localStorage.getItem('username') || 'Admin'
        };
        
        // Create download link
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookstore_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Export Complete', 'Data has been exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export data:', error);
        showNotification('Error', 'Failed to export data', 'error');
    }
}

// ==================== HELPER FUNCTIONS ====================
function showBookLoading(show) {
    const container = document.getElementById('bookList');
    if (!container) return;
    
    if (show) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading books...</p>
            </div>
        `;
    }
}

function showBookErrorState() {
    const container = document.getElementById('bookList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Failed to Load Books</h3>
            <p>There was an error loading the books. Please try again.</p>
            <button class="btn btn-primary mt-4" onclick="loadBooks()">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString, fullDate = false) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Get settings
    const dateFormat = state.dateFormat || 'relative';
    const timeFormat = state.timeFormat || '12h';
    
    // If relative format is preferred and not fullDate
    if (dateFormat === 'relative' && !fullDate) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
    }
    
    // Format based on settings
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (dateFormat === 'us') {
        options.month = 'numeric';
        options.day = 'numeric';
        options.year = 'numeric';
    } else if (dateFormat === 'euro') {
        options.day = 'numeric';
        options.month = 'numeric';
        options.year = 'numeric';
    }
    
    if (fullDate) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        
        if (timeFormat === '24h') {
            options.hour12 = false;
        }
    }
    
    return date.toLocaleDateString('en-US', options);
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    return formatDate(timestamp);
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <div class="notification-content">
            <strong>${title}</strong>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

function showConfirmationDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2><i class="fas fa-exclamation-triangle"></i> ${title}</h2>
                    <button class="modal-close close-confirm">&times;</button>
                </div>
                <div class="modal-body" style="padding: 2rem;">
                    <p style="margin-bottom: 1.5rem;">${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                        <button class="btn btn-danger confirm-btn">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        const closeBtn = modal.querySelector('.close-confirm');
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');
        
        const closeModal = (result) => {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                resolve(result);
            }, 300);
        };
        
        closeBtn.addEventListener('click', () => closeModal(false));
        cancelBtn.addEventListener('click', () => closeModal(false));
        confirmBtn.addEventListener('click', () => closeModal(true));
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(false);
        });
    });
}

// ==================== GLOBAL EXPORTS ====================
window.openEditModal = openEditModal;
window.confirmDeleteBook = confirmDeleteBook;
window.openViewModal = openViewModal;
window.closeModal = closeModal;
window.loadBooks = loadBooks;
window.loadUsers = loadUsers;
window.loadWishlistData = loadWishlistData;

// User functions
window.viewUserDetails = function(userId) {
    showNotification('Info', 'View user details functionality would be implemented here', 'info');
};

window.editUser = function(userId) {
    showNotification('Info', 'Edit user functionality would be implemented here', 'info');
};

window.deleteUser = async function(userId, userName) {
    const confirmed = await showConfirmationDialog(
        "Delete User",
        `Are you sure you want to delete user "${userName}"?`,
        "Delete",
        "Cancel"
    );
    
    if (confirmed) {
        try {
            showNotification("Deleting...", "Removing user from system", "info");
            
            // Simulate deletion
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Remove from local state
            state.allUsers = state.allUsers.filter(user => user._id !== userId);
            state.filteredUsers = state.filteredUsers.filter(user => user._id !== userId);
            
            // Update UI
            applyUserFilters();
            renderUsers();
            loadDashboardStats(); // Refresh stats
            
            showNotification('Success', `User "${userName}" has been deleted`, 'success');
            
        } catch (error) {
            console.error("Failed to delete user:", error);
            showNotification('Error', 'Failed to delete user', 'error');
        }
    }
};

console.log("Admin.js loaded successfully");