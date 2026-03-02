document.addEventListener("DOMContentLoaded", () => {
  // Check login token first
  if (!localStorage.getItem("token")) {
    window.location.href = "../Student-dahbord/login.html";
    return;
  }

  // Initialize the page
  initializePage();
});

function initializePage() {
  // Initialize state
  window.currentPage = 1;
  window.pageSize = parseInt(localStorage.getItem('pageSize')) || 12;
  window.currentView = localStorage.getItem('viewMode') || 'grid';
  window.isDarkMode = localStorage.getItem('darkMode') === 'true';
  window.currentSection = 'home';
  
  // Apply saved settings
  applyViewMode();
  applyThemeMode();
  updateWishlistCount();
  
  // Initialize navigation
  initializeNavigation();
  
  // Initialize all components
  initializeComponents();
  
  // Load initial data
  loadBooks();
}

function initializeNavigation() {
  // Navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      navigateToSection(section);
    });
  });
  
  // Footer links
  const footerLinks = document.querySelectorAll('.footer-section a[data-section]');
  footerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      navigateToSection(section);
    });
  });
  
  // CTA button
  const ctaButton = document.querySelector('.cta-button[data-section]');
  if (ctaButton) {
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      const section = ctaButton.getAttribute('data-section');
      navigateToSection(section);
    });
  }
}

function navigateToSection(section) {
  // Update active nav link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-section') === section) {
      link.classList.add('active');
    }
  });
  
  // Hide all sections
  const sections = document.querySelectorAll('.section');
  sections.forEach(sec => {
    sec.classList.remove('active');
  });
  
  // Show target section
  const targetSection = document.getElementById(`${section}Section`);
  if (targetSection) {
    targetSection.classList.add('active');
    window.currentSection = section;
    
    // Load section-specific data
    if (section === 'wishlist') {
      loadWishlist();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function initializeComponents() {
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // View toggle
  const viewToggle = document.getElementById('viewToggle');
  if (viewToggle) {
    viewToggle.addEventListener('click', toggleViewMode);
  }
  
  // View controls in books section
  const viewControls = document.querySelectorAll('.view-controls .view-btn');
  viewControls.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      setViewMode(view);
    });
  });
  
  // Page size selector
  const pageSizeSelect = document.getElementById('pageSize');
  if (pageSizeSelect) {
    pageSizeSelect.value = window.pageSize;
    pageSizeSelect.addEventListener('change', (e) => {
      window.pageSize = parseInt(e.target.value);
      localStorage.setItem('pageSize', window.pageSize);
      window.currentPage = 1;
      applyFilters();
    });
  }
  
  // Sort selector
  const sortSelect = document.getElementById('sortFilter');
  if (sortSelect) {
    sortSelect.addEventListener('change', applyFilters);
  }
  
  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keyup", debounce(applyFilters, 300));
  }
  
  // Year filter
  const yearFilter = document.getElementById("yearFilter");
  if (yearFilter) {
    yearFilter.addEventListener("change", applyFilters);
  }
  
  // Category filter
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFilters);
  }
  
  // Search button
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', applyFilters);
  }
  
  // Clear button
  const clearBtn = document.querySelector('.clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilters);
  }
  
  // Quick search chips
  const chipElements = document.querySelectorAll('.chip');
  chipElements.forEach(chip => {
    chip.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = chip.textContent;
        applyFilters();
      }
    });
  });
  
  // Logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
  
  // Update user info
  updateUserInfo();
}

function toggleTheme() {
  window.isDarkMode = !window.isDarkMode;
  applyThemeMode();
  localStorage.setItem('darkMode', window.isDarkMode);
}

function applyThemeMode() {
  const body = document.body;
  const themeBtn = document.getElementById('themeToggle');
  const icon = themeBtn?.querySelector('i');
  const text = themeBtn?.querySelector('span');
  
  if (window.isDarkMode) {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
    if (icon) icon.className = 'fas fa-sun';
    if (text) text.textContent = 'Light Mode';
  } else {
    body.classList.add('light-mode');
    body.classList.remove('dark-mode');
    if (icon) icon.className = 'fas fa-moon';
    if (text) text.textContent = 'Dark Mode';
  }
}

function toggleViewMode() {
  const newView = window.currentView === 'grid' ? 'list' : 'grid';
  setViewMode(newView);
}

function setViewMode(view) {
  window.currentView = view;
  localStorage.setItem('viewMode', view);
  applyViewMode();
  
  // Update active button in books section
  const viewBtns = document.querySelectorAll('.view-controls .view-btn');
  viewBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-view') === view) {
      btn.classList.add('active');
    }
  });
}

function applyViewMode() {
  const container = document.getElementById('booksContainer');
  if (container) {
    container.classList.remove('grid-view', 'list-view');
    container.classList.add(`${window.currentView}-view`);
  }
}

// Debounce function for search
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Update user info in navbar
function updateUserInfo() {
  const token = localStorage.getItem("token");
  if (!token) return;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const usernameElement = document.querySelector('.username');
    
    if (usernameElement && payload.username) {
      usernameElement.textContent = payload.username;
    }
  } catch (error) {
    // Silent error handling
  }
}

// Update wishlist count
function updateWishlistCount() {
  try {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const countElement = document.querySelector('.wishlist-count');
    if (countElement) {
      countElement.textContent = wishlist.length;
    }
  } catch (error) {
    // Reset corrupted wishlist
    localStorage.removeItem('wishlist');
  }
}

// Handle logout
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    // Clear all sensitive data
    localStorage.removeItem("token");
    localStorage.removeItem("wishlist");
    localStorage.removeItem("darkMode");
    localStorage.removeItem("viewMode");
    localStorage.removeItem("pageSize");
    
    showNotification("Logged out successfully", "success");
    
    setTimeout(() => {
      window.location.href = "../Student-dahbord/login.html";
    }, 1000);
  }
}

// Clear all filters
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
  applyFilters();
  showNotification("Filters cleared", "info");
}

// Show notification
function showNotification(message, type = "info") {
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

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 4000);

  // Close button
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    });
  }
}

// Show loading skeleton
function showLoadingSkeleton() {
  const container = document.getElementById("booksContainer");
  if (!container) return;
  
  const skeletonCount = window.currentView === 'grid' ? 12 : 6;
  container.innerHTML = `
    <div class="loading-skeleton ${window.currentView}-view">
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
}

// Store books for filtering
let allBooks = [];

// Get API base URL
function getApiBaseUrl() {
  const frontendHost = window.location.hostname;
  
  if (frontendHost === 'localhost' || frontendHost === '127.0.0.1') {
    return 'http://localhost:5000/api/student';
  }
  
  return '/api/student';
}

// Security: Sanitize input
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
}

// Security: Escape HTML
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Security: Validate ID
function isValidId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-f0-9]{24}$/i.test(id) || /^[a-zA-Z0-9_-]+$/.test(id);
}

// Load all books
async function loadBooks() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    window.location.href = "../Student-dahbord/login.html";
    return;
  }

  showLoadingSkeleton();
  
  try {
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/books`;
    
    const res = await fetch(apiUrl, {
      headers: { 
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (res.status === 401 || res.status === 403) {
      showNotification("Session expired. Please login again.", "error");
      setTimeout(() => {
        window.location.href = "../Student-dahbord/login.html";
      }, 2000);
      return;
    }

    if (res.ok) {
      const data = await res.json();
      
      if (Array.isArray(data)) {
        allBooks = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.books)) {
          allBooks = data.books;
        } else if (Array.isArray(data.data)) {
          allBooks = data.data;
        } else {
          throw new Error("Invalid data format");
        }
      }
      
      allBooks = transformBackendData(allBooks);
      
      if (allBooks.length === 0) {
        await loadMockBooks();
      } else {
        showNotification(`Loaded ${allBooks.length} books`, "success");
      }
    } else {
      await loadMockBooks();
      showNotification("Connected to bookstore", "info");
    }
    
    applyFilters();
    
  } catch (error) {
    await loadMockBooks();
    showNotification("Connected to bookstore", "info");
  }
}

// Transform backend data
function transformBackendData(books) {
  if (!books || !Array.isArray(books)) return [];
  
  return books.map(book => {
    const sanitizedTitle = sanitizeInput(book.title || "");
    const sanitizedAuthor = sanitizeInput(book.author || "");
    const sanitizedCode = sanitizeInput(book.code || book.isbn || "");
    const sanitizedCategory = sanitizeInput(book.category || "");
    
    return {
      id: isValidId(book._id || book.id) ? (book._id || book.id) : "invalid",
      title: sanitizedTitle || "Untitled Book",
      author: sanitizedAuthor || "Unknown Author",
      isbn: sanitizedCode || "N/A",
      category: sanitizedCategory || "general",
      quantity: parseInt(book.quantity) || 0,
      price: parseFloat(book.price) || 0,
      createdAt: book.createdAt || new Date().toISOString()
    };
  }).filter(book => book.id !== "invalid");
}

// Load mock books
async function loadMockBooks() {
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
}

// Apply filters and pagination
function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  const yearFilter = document.getElementById("yearFilter");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  
  if (!searchInput || !yearFilter || !categoryFilter || !sortFilter) return;
  
  const query = sanitizeInput(searchInput.value.trim().toLowerCase());
  const year = yearFilter.value;
  const category = categoryFilter.value;
  const sort = sortFilter.value;

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
  const totalPages = Math.ceil(totalBooks / window.pageSize);
  const startIndex = (window.currentPage - 1) * window.pageSize;
  const endIndex = Math.min(startIndex + window.pageSize, totalBooks);
  const paginatedBooks = filtered.slice(startIndex, endIndex);

  // Update results count
  updateResultsCount(paginatedBooks.length, totalBooks);
  
  // Display books
  displayBooks(paginatedBooks);
  
  // Update pagination controls
  updatePagination(totalPages);
  
  // Show message if no results
  if (paginatedBooks.length === 0 && (query.length > 0 || year !== "all" || category !== "all")) {
    showNotification("No books match your search criteria", "info");
  }
}

// Update results count
function updateResultsCount(shown, total) {
  const resultsCount = document.querySelector('.results-count');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${shown} of ${total} books`;
  }
}

// Display books function
function displayBooks(books) {
  const container = document.getElementById("booksContainer");
  if (!container) return;
  
  if (books.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-book-open"></i>
        <h3>No Books Found</h3>
        <p>Try adjusting your search or filter criteria</p>
        <button class="clear-filters-btn">
          <i class="fas fa-redo"></i> Clear Filters
        </button>
      </div>
    `;
    
    const clearBtn = container.querySelector('.clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearFilters);
    }
    return;
  }

  // Get wishlist for checking
  let wishlist = [];
  try {
    wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  } catch (e) {
    localStorage.removeItem('wishlist');
  }

  if (window.currentView === 'grid') {
    container.innerHTML = books.map(book => {
      const safeId = isValidId(book.id) ? escapeHtml(book.id) : '';
      const isInWishlist = wishlist.some(item => item.id === book.id);
      
      return `
      <div class="book-card">
        <div class="book-card-header">
          <span class="book-level">${escapeHtml(getBookLevel(book.isbn))} Level</span>
          <span class="book-status ${book.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
            ${book.quantity > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
        
        <div class="book-cover-placeholder">
          <i class="fas fa-book"></i>
        </div>
        
        <h3 class="book-title">${escapeHtml(book.title || "Untitled Book")}</h3>
        <p class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author || "Unknown Author")}</p>
        <p class="book-code"><i class="fas fa-barcode"></i> ${escapeHtml(book.isbn || "N/A")}</p>
        
        <div class="book-details">
          <div class="detail-item">
            <span class="detail-label">Available:</span>
            <span class="detail-value quantity ${book.quantity > 0 ? 'available' : 'unavailable'}">
              ${book.quantity || 0}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Price:</span>
            <span class="detail-value price">₦${formatPrice(book.price || 0)}</span>
          </div>
        </div>
        
        <div class="book-actions">
          <button class="view-btn" data-book-id="${safeId}">
            <i class="fas fa-eye"></i> View Details
          </button>
          <button class="wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}" data-book-id="${safeId}">
            <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Wishlist'}
          </button>
        </div>
        
        <small class="upload-time">
          <i class="far fa-clock"></i> Added ${formatDate(book.createdAt)}
        </small>
      </div>
    `}).join('');
  } else {
    // List view
    container.innerHTML = books.map(book => {
      const safeId = isValidId(book.id) ? escapeHtml(book.id) : '';
      const isInWishlist = wishlist.some(item => item.id === book.id);
      
      return `
      <div class="book-card">
        <div class="book-cover-placeholder">
          <i class="fas fa-book"></i>
        </div>
        
        <div class="book-info">
          <div class="book-card-header">
            <span class="book-level">${escapeHtml(getBookLevel(book.isbn))} Level</span>
            <span class="book-status ${book.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
              ${book.quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
          
          <h3 class="book-title">${escapeHtml(book.title || "Untitled Book")}</h3>
          <p class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author || "Unknown Author")}</p>
          <p class="book-code"><i class="fas fa-barcode"></i> ${escapeHtml(book.isbn || "N/A")}</p>
          
          <div class="book-details">
            <div class="detail-item">
              <span class="detail-label">Available:</span>
              <span class="detail-value quantity ${book.quantity > 0 ? 'available' : 'unavailable'}">
                ${book.quantity || 0}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Price:</span>
              <span class="detail-value price">₦${formatPrice(book.price || 0)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Category:</span>
              <span class="detail-value">${escapeHtml(getCategoryName(book.category))}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Added:</span>
              <span class="detail-value">${formatDate(book.createdAt)}</span>
            </div>
          </div>
          
          <div class="book-actions">
            <button class="view-btn" data-book-id="${safeId}">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button class="wishlist-btn ${isInWishlist ? 'in-wishlist' : ''}" data-book-id="${safeId}">
              <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i> ${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            </button>
          </div>
        </div>
      </div>
    `}).join('');
  }
  
  // Add event listeners
  container.addEventListener('click', handleBookCardClick);
}

// Handle book card clicks
function handleBookCardClick(event) {
  const target = event.target;
  const button = target.closest('button');
  
  if (!button) return;
  
  const bookId = button.getAttribute('data-book-id');
  if (!bookId || !isValidId(bookId)) return;
  
  if (button.classList.contains('view-btn')) {
    viewBookDetails(bookId);
  } else if (button.classList.contains('wishlist-btn')) {
    toggleWishlist(bookId, button);
  }
}

// Helper functions
function getBookLevel(isbn) {
  if (!isbn) return "Unknown";
  const match = isbn.match(/\d+/);
  if (!match) return "Unknown";
  const courseNumber = parseInt(match[0]);
  if (isNaN(courseNumber)) return "Unknown";
  const level = Math.floor(courseNumber / 100) * 100;
  return level > 0 ? level.toString() : "Unknown";
}

function getCategoryName(category) {
  const categories = {
    'science': 'Science & Technology',
    'arts': 'Arts & Humanities',
    'business': 'Business & Economics',
    'law': 'Law',
    'medicine': 'Medicine',
    'general': 'General'
  };
  return categories[category] || 'General';
}

function formatPrice(price) {
  const numPrice = Number(price);
  if (isNaN(numPrice)) return "0.00";
  return numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
  if (!dateString) return "recently";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return "recently";
  }
}

// Pagination
function updatePagination(totalPages) {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <button class="page-btn prev-btn" ${window.currentPage === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i> Previous
    </button>
  `;
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, window.currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
    if (startPage > 2) {
      paginationHTML += `<span class="page-dots">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="page-btn ${i === window.currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>
    `;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `<span class="page-dots">...</span>`;
    }
    paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }
  
  // Next button
  paginationHTML += `
    <button class="page-btn next-btn" ${window.currentPage === totalPages ? 'disabled' : ''}>
      Next <i class="fas fa-chevron-right"></i>
    </button>
  `;
  
  paginationContainer.innerHTML = paginationHTML;
  
  // Add event listeners
  const pageBtns = paginationContainer.querySelectorAll('.page-btn');
  pageBtns.forEach(btn => {
    if (btn.classList.contains('prev-btn')) {
      btn.addEventListener('click', () => {
        if (window.currentPage > 1) {
          window.currentPage--;
          applyFilters();
        }
      });
    } else if (btn.classList.contains('next-btn')) {
      btn.addEventListener('click', () => {
        if (window.currentPage < totalPages) {
          window.currentPage++;
          applyFilters();
        }
      });
    } else if (btn.hasAttribute('data-page')) {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'));
        if (page !== window.currentPage) {
          window.currentPage = page;
          applyFilters();
        }
      });
    }
  });
}

// Wishlist functionality
function toggleWishlist(bookId, button) {
  if (!isValidId(bookId)) {
    showNotification("Invalid book selection", "error");
    return;
  }
  
  const book = allBooks.find(b => b.id === bookId);
  if (!book) {
    showNotification("Book not found", "error");
    return;
  }
  
  try {
    let wishlist = [];
    try {
      wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    } catch (e) {
      localStorage.removeItem('wishlist');
    }
    
    const existingIndex = wishlist.findIndex(item => item.id === bookId);
    
    if (existingIndex !== -1) {
      // Remove from wishlist
      wishlist.splice(existingIndex, 1);
      if (button) {
        button.classList.remove('in-wishlist');
        button.innerHTML = '<i class="far fa-heart"></i> Wishlist';
      }
      showNotification("Removed from wishlist", "success");
    } else {
      // Add to wishlist
      wishlist.push({
        id: bookId,
        title: sanitizeInput(book.title),
        author: sanitizeInput(book.author),
        isbn: sanitizeInput(book.isbn),
        price: book.price,
        category: book.category,
        addedAt: new Date().toISOString()
      });
      
      // Limit wishlist size
      if (wishlist.length > 100) {
        wishlist = wishlist.slice(-100);
      }
      
      if (button) {
        button.classList.add('in-wishlist');
        button.innerHTML = '<i class="fas fa-heart"></i> In Wishlist';
      }
      showNotification("Added to wishlist", "success");
      
      // Send to backend (admin notification)
      sendWishlistToBackend(book);
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistCount();
    
    // Update wishlist section if active
    if (window.currentSection === 'wishlist') {
      loadWishlist();
    }
    
  } catch (error) {
    showNotification("Failed to update wishlist", "error");
  }
}

// Send wishlist to backend (for admin)
async function sendWishlistToBackend(book) {
  const token = localStorage.getItem("token");
  if (!token) return;
  
  try {
    const baseUrl = getApiBaseUrl();
    const apiUrl = `${baseUrl}/wishlist`;
    
    await fetch(apiUrl, {
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
    // Silent error - don't show to user
  }
}

// Load wishlist
function loadWishlist() {
  const container = document.getElementById('wishlistContainer');
  if (!container) return;
  
  try {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (wishlist.length === 0) {
      container.innerHTML = `
        <div class="empty-wishlist">
          <i class="fas fa-heart"></i>
          <h3>Your wishlist is empty</h3>
          <p>Start adding books to your wishlist!</p>
          <button class="browse-btn" data-section="books">
            <i class="fas fa-book"></i> Browse Books
          </button>
        </div>
      `;
      
      const browseBtn = container.querySelector('.browse-btn');
      if (browseBtn) {
        browseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          navigateToSection('books');
        });
      }
      return;
    }
    
    container.innerHTML = `
      <div class="wishlist-books ${window.currentView}-view">
        ${wishlist.map(item => `
          <div class="wishlist-item">
            <div class="wishlist-cover">
              <i class="fas fa-book"></i>
            </div>
            <div class="wishlist-info">
              <h3>${escapeHtml(item.title)}</h3>
              <p class="wishlist-author"><i class="fas fa-user"></i> ${escapeHtml(item.author)}</p>
              <p class="wishlist-code"><i class="fas fa-barcode"></i> ${escapeHtml(item.isbn)}</p>
              <p class="wishlist-price"><i class="fas fa-tag"></i> ₦${formatPrice(item.price)}</p>
              <small class="wishlist-added">
                <i class="far fa-clock"></i> Added ${formatDate(item.addedAt)}
              </small>
              <div class="wishlist-actions">
                <button class="view-btn" data-book-id="${escapeHtml(item.id)}">
                  <i class="fas fa-eye"></i> View
                </button>
                <button class="remove-btn" data-book-id="${escapeHtml(item.id)}">
                  <i class="fas fa-trash"></i> Remove
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    // Add event listeners for wishlist items
    container.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      
      const bookId = button.getAttribute('data-book-id');
      if (!bookId) return;
      
      if (button.classList.contains('view-btn')) {
        viewBookDetails(bookId);
      } else if (button.classList.contains('remove-btn')) {
        toggleWishlist(bookId, null);
      }
    });
    
  } catch (error) {
    localStorage.removeItem('wishlist');
    loadWishlist();
  }
}

// IMPROVED VIEW DETAILS MODAL
function viewBookDetails(bookId) {
  if (!isValidId(bookId)) {
    showNotification("Invalid book selection", "error");
    return;
  }

  const book = allBooks.find(b => b.id === bookId);
  if (!book) {
    showNotification("Book not found", "error");
    return;
  }

  // Check wishlist status
  let wishlist = [];
  try {
    wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  } catch (e) {
    localStorage.removeItem('wishlist');
  }
  const isInWishlist = wishlist.some(item => item.id === bookId);

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
      background: ${window.isDarkMode ? '#1e1e1e' : '#ffffff'};
      color: ${window.isDarkMode ? '#e0e0e0' : '#222'};
      border-radius: 16px;
      max-width: 620px;
      width: 100%;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    ">
      <!-- Header -->
      <div class="modal-header" style="
        padding: 24px 28px;
        border-bottom: 1px solid ${window.isDarkMode ? '#333' : '#eee'};
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h2 style="margin: 0; font-size: 1.5rem; color: ${window.isDarkMode ? '#95d5b2' : '#2c3e50'};">
          ${escapeHtml(book.title)}
        </h2>
        <button class="modal-close" style="
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: ${window.isDarkMode ? '#aaa' : '#666'};
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">&times;</button>
      </div>

      <!-- Body -->
      <div class="modal-body" style="padding: 28px;">
        <div style="display: grid; grid-template-columns: 160px 1fr; gap: 28px;">
          <!-- Book Cover -->
          <div style="
            width: 160px;
            height: 220px;
            background: ${window.isDarkMode ? '#2a2a2a' : '#f8f9fa'};
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 70px;
            color: ${window.isDarkMode ? '#4ade80' : '#6c757d'};
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          ">
            <i class="fas fa-book-open"></i>
          </div>

          <!-- Details -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div><strong>Author:</strong> ${escapeHtml(book.author)}</div>
            <div><strong>Course Code:</strong> ${escapeHtml(book.isbn)}</div>
            <div><strong>Level:</strong> ${escapeHtml(getBookLevel(book.isbn))} Level</div>
            <div><strong>Category:</strong> ${escapeHtml(getCategoryName(book.category))}</div>
            <div><strong>Price:</strong> <span style="color:#22c55e; font-weight:600;">₦${formatPrice(book.price)}</span></div>
            <div><strong>Available:</strong> 
              <span style="color:${book.quantity > 0 ? '#22c55e' : '#ef4444'}; font-weight:600;">
                ${book.quantity} copies
              </span>
            </div>
            <div><strong>Added:</strong> ${formatDate(book.createdAt)}</div>
          </div>
        </div>

        <!-- Action Button (Only Wishlist now) -->
        <div style="margin-top: 32px; text-align: center;">
          <button id="modalWishlistBtn" data-book-id="${escapeHtml(bookId)}" style="
            background: ${isInWishlist ? '#166534' : '#22c55e'};
            color: white;
            border: none;
            padding: 14px 40px;
            font-size: 1.1rem;
            font-weight: 600;
            border-radius: 50px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);
            transition: all 0.2s;
          ">
            <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
            ${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
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
}

// Security measures
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
  
  // Prevent drag and drop of sensitive elements
  document.addEventListener('dragstart', (e) => {
    if (e.target.closest('.book-card')) {
      e.preventDefault();
    }
  }, false);
})();