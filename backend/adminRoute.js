const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Book = require("./BookModel");
const User = require("./UserModel");
const Wishlist = require("./WishlistModel");
const Activity = require("./ActivityModel");

// ==================== ADMIN MIDDLEWARE ====================
const adminAuth = async (req, res, next) => {
  try {
    console.log("Admin auth check...");
    
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No authentication token" });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "No authentication token" });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log("Decoded token:", decoded);
    
    // Find user
    const user = await User.findById(decoded.id || decoded._id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Check if user is admin
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    req.user = user;
    req.admin = user;
    console.log("Admin authenticated:", user.email);
    next();
    
  } catch (error) {
    console.error("Admin auth error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    
    res.status(500).json({ 
      error: "Authentication failed",
      message: error.message 
    });
  }
};

// DASHBOARD STATS
router.get("/dashboard-stats", adminAuth, async (req, res) => {
  try {
    console.log("Fetching dashboard stats for admin:", req.admin.email);
    
    const totalUsers = await User.countDocuments();
    const totalBooks = await Book.countDocuments();
    
    // Calculate total copies
    const totalCopiesResult = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalCopies: { $sum: "$quantity" }
        }
      }
    ]);
    const totalCopies = totalCopiesResult[0]?.totalCopies || 0;
    
    // Calculate total value (price * quantity)
    const totalValueResult = await Book.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { 
            $sum: { $multiply: ["$price", "$quantity"] }
          }
        }
      }
    ]);
    const totalValue = totalValueResult[0]?.totalValue || 0;
    
    // Total wishlists
    const totalWishlists = await Wishlist.countDocuments();
    
    // Get recent activities (last 5)
    const recentActivity = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("type message createdAt")
      .lean();
    
    res.json({
      totalUsers,
      totalBooks,
      totalCopies,
      totalValue,
      totalWishlists,
      recentActivity: recentActivity.map(activity => ({
        ...activity,
        timestamp: activity.createdAt
      }))
    });
    
    console.log("Dashboard stats sent successfully");
    
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ 
      error: "Failed to load dashboard stats",
      message: error.message 
    });
  }
});

// ==================== BOOK MANAGEMENT ====================
// Get all books with optional filtering
router.get("/books", adminAuth, async (req, res) => {
  try {
    console.log("Fetching books for admin");
    
    const books = await Book.find().sort({ createdAt: -1 }).lean();
    
    // Get wishlist count for each book
    const booksWithWishlistCount = await Promise.all(
      books.map(async (book) => {
        const wishlistCount = await Wishlist.countDocuments({ 
          bookId: book._id 
        });
        
        return {
          ...book,
          wishlistCount,
          id: book._id,
          _id: book._id
        };
      })
    );
    
    console.log(`Fetched ${booksWithWishlistCount.length} books`);
    res.json(booksWithWishlistCount);
    
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ 
      error: "Failed to load books",
      message: error.message 
    });
  }
});

// Add new book
router.post("/books", adminAuth, async (req, res) => {
  try {
    console.log("Adding new book:", req.body);
    
    const { 
      title, 
      author, 
      isbn, 
      price, 
      quantity, 
      level, 
      description 
    } = req.body;
    
    // Validate required fields
    if (!title || !author || !isbn || price === undefined || quantity === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["title", "author", "isbn", "price", "quantity"]
      });
    }
    
    // Check if book already exists
    const existingBook = await Book.findOne({ isbn });
    if (existingBook) {
      return res.status(400).json({ 
        error: "Book with this course code already exists" 
      });
    }
    
    const newBook = new Book({
      title,
      author,
      isbn,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      level: level || undefined,
      description: description || undefined,
      addedBy: req.admin._id
    });
    
    await newBook.save();
    
    // Log activity
    await Activity.create({
      type: "book_added",
      message: `New book added: "${title}"`,
      adminId: req.admin._id,
      bookId: newBook._id
    });
    
    console.log("Book added successfully:", newBook._id);
    
    res.status(201).json({
      success: true,
      message: "Book added successfully",
      book: {
        ...newBook.toObject(),
        wishlistCount: 0
      }
    });
    
  } catch (error) {
    console.error("Add book error:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({ 
        error: "Validation error",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to add book",
      message: error.message 
    });
  }
});

// Update book
router.put("/books/:id", adminAuth, async (req, res) => {
  try {
    console.log(`Updating book ${req.params.id}:`, req.body);
    
    const { 
      title, 
      author, 
      isbn, 
      price, 
      quantity, 
      level, 
      description 
    } = req.body;
    
    // Validate required fields
    if (!title || !author || !isbn || price === undefined || quantity === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields" 
      });
    }
    
    const updateData = {
      title,
      author,
      isbn,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      level: level || undefined,
      description: description || undefined,
      updatedAt: new Date()
    };
    
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!updatedBook) {
      return res.status(404).json({ 
        error: "Book not found" 
      });
    }
    
    // Log activity
    await Activity.create({
      type: "book_updated",
      message: `Book updated: "${title}"`,
      adminId: req.admin._id,
      bookId: updatedBook._id
    });
    
    console.log("Book updated successfully:", updatedBook._id);
    
    res.json({
      success: true,
      message: "Book updated successfully",
      book: updatedBook
    });
    
  } catch (error) {
    console.error("Update book error:", error);
    
    if (error.name === "ValidationError") {
      return res.status(400).json({ 
        error: "Validation error",
        details: error.errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: "Course code already exists" 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to update book",
      message: error.message 
    });
  }
});

// Update book availability
router.put("/books/:id/availability", adminAuth, async (req, res) => {
  try {
    console.log(`Updating availability for book ${req.params.id}:`, req.body);
    
    const { isAvailable } = req.body;
    
    if (isAvailable === undefined) {
      return res.status(400).json({ 
        error: "isAvailable field is required" 
      });
    }
    
    const updateData = {
      quantity: isAvailable ? 1 : 0,
      updatedAt: new Date()
    };
    
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedBook) {
      return res.status(404).json({ 
        error: "Book not found" 
      });
    }
    
    // Log activity
    await Activity.create({
      type: "book_availability_updated",
      message: `Book "${updatedBook.title}" marked as ${isAvailable ? 'available' : 'unavailable'}`,
      adminId: req.admin._id,
      bookId: updatedBook._id
    });
    
    res.json({
      success: true,
      message: `Book marked as ${isAvailable ? 'available' : 'unavailable'}`,
      book: updatedBook
    });
    
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ 
      error: "Failed to update book availability",
      message: error.message 
    });
  }
});

// Delete book
router.delete("/books/:id", adminAuth, async (req, res) => {
  try {
    console.log(`Deleting book ${req.params.id}`);
    
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({ 
        error: "Book not found" 
      });
    }
    
    // Delete the book
    await Book.findByIdAndDelete(req.params.id);
    
    // Also remove from all wishlists
    await Wishlist.deleteMany({ bookId: req.params.id });
    
    // Log activity
    await Activity.create({
      type: "book_deleted",
      message: `Book deleted: "${book.title}"`,
      adminId: req.admin._id,
      bookId: book._id
    });
    
    console.log("Book deleted successfully:", book._id);
    
    res.json({ 
      success: true,
      message: "Book deleted successfully" 
    });
    
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({ 
      error: "Failed to delete book",
      message: error.message 
    });
  }
});

// ==================== USER MANAGEMENT ====================
// Get all users
router.get("/users", adminAuth, async (req, res) => {
  try {
    console.log("Fetching users for admin");
    
    const users = await User.find()
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .lean();
    
    // Format users for frontend
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name || "Unknown",
      email: user.email,
      studentId: user.studentId || "N/A",
      role: user.role || "student",
      status: user.status || "active",
      createdAt: user.createdAt,
      isAdmin: user.role === "admin"
    }));
    
    console.log(`Fetched ${formattedUsers.length} users`);
    res.json({ 
      success: true,
      users: formattedUsers 
    });
    
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ 
      error: "Failed to load users",
      message: error.message 
    });
  }
});

// ==================== WISHLIST MANAGEMENT ====================
// Get wishlist statistics
router.get("/wishlists/stats", adminAuth, async (req, res) => {
  try {
    console.log("Fetching wishlist stats");
    
    const totalWishlists = await Wishlist.countDocuments();
    const uniqueBooks = await Wishlist.distinct("bookId");
    const activeUsers = await Wishlist.distinct("userId");
    
    // Calculate average wishlists per user
    const avgPerUserResult = await Wishlist.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          average: { $avg: "$count" }
        }
      }
    ]);
    
    const avgPerUser = avgPerUserResult[0]?.average || 0;
    
    res.json({
      success: true,
      totalWishlists,
      uniqueBooks: uniqueBooks.length,
      activeUsers: activeUsers.length,
      avgPerUser: parseFloat(avgPerUser.toFixed(1))
    });
    
  } catch (error) {
    console.error("Wishlist stats error:", error);
    res.status(500).json({ 
      error: "Failed to load wishlist statistics",
      message: error.message 
    });
  }
});

// Get recent wishlists
router.get("/wishlists/recent", adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    console.log(`Fetching ${limit} recent wishlists`);
    
    const wishlists = await Wishlist.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email")
      .populate("bookId", "title author isbn")
      .lean();
    
    const formattedWishlists = wishlists.map(wishlist => ({
      _id: wishlist._id,
      userName: wishlist.userId?.name || "Unknown",
      userEmail: wishlist.userId?.email || "N/A",
      bookTitle: wishlist.bookId?.title || "Untitled",
      bookAuthor: wishlist.bookId?.author || "Unknown",
      courseCode: wishlist.bookId?.isbn || "N/A",
      addedAt: wishlist.createdAt,
      userId: wishlist.userId?._id,
      bookId: wishlist.bookId?._id
    }));
    
    res.json({ 
      success: true,
      wishlists: formattedWishlists 
    });
    
  } catch (error) {
    console.error("Recent wishlists error:", error);
    res.status(500).json({ 
      error: "Failed to load recent wishlists",
      message: error.message 
    });
  }
});

// Get top wishlisted books
router.get("/wishlists/top-books", adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    console.log(`Fetching top ${limit} wishlisted books`);
    
    const topBooks = await Wishlist.aggregate([
      {
        $group: {
          _id: "$bookId",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "book"
        }
      },
      { $unwind: "$book" },
      {
        $project: {
          _id: "$book._id",
          title: "$book.title",
          author: "$book.author",
          courseCode: "$book.isbn",
          wishlistCount: "$count"
        }
      }
    ]);
    
    res.json({ 
      success: true,
      books: topBooks 
    });
    
  } catch (error) {
    console.error("Top books error:", error);
    res.status(500).json({ 
      error: "Failed to load top wishlisted books",
      message: error.message 
    });
  }
});

// Get top wishlist users
router.get("/wishlists/top-users", adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    console.log(`Fetching top ${limit} wishlist users`);
    
    const topUsers = await Wishlist.aggregate([
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          name: "$user.name",
          email: "$user.email",
          wishlistCount: "$count"
        }
      }
    ]);
    
    res.json({ 
      success: true,
      users: topUsers 
    });
    
  } catch (error) {
    console.error("Top users error:", error);
    res.status(500).json({ 
      error: "Failed to load top wishlist users",
      message: error.message 
    });
  }
});

// Delete wishlist item
router.delete("/wishlists/:id", adminAuth, async (req, res) => {
  try {
    console.log(`Deleting wishlist item ${req.params.id}`);
    
    const wishlistItem = await Wishlist.findById(req.params.id);
    
    if (!wishlistItem) {
      return res.status(404).json({ 
        success: false,
        error: "Wishlist item not found" 
      });
    }
    
    // Get book info for activity log
    const book = await Book.findById(wishlistItem.bookId);
    const user = await User.findById(wishlistItem.userId);
    
    // Delete the wishlist item
    await Wishlist.findByIdAndDelete(req.params.id);
    
    // Log activity
    await Activity.create({
      type: "wishlist_removed",
      message: `Removed "${book?.title || 'Unknown book'}" from ${user?.name || 'Unknown user'}'s wishlist`,
      adminId: req.admin._id,
      userId: wishlistItem.userId,
      bookId: wishlistItem.bookId
    });
    
    res.json({ 
      success: true,
      message: "Wishlist item removed successfully" 
    });
    
  } catch (error) {
    console.error("Delete wishlist error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to remove wishlist item",
      message: error.message 
    });
  }
});

// Get wishlist item details
router.get("/wishlists/:id/details", adminAuth, async (req, res) => {
  try {
    console.log(`Fetching details for wishlist item ${req.params.id}`);
    
    const wishlistItem = await Wishlist.findById(req.params.id)
      .populate("userId", "name email studentId")
      .populate("bookId", "title author isbn price")
      .lean();
    
    if (!wishlistItem) {
      return res.status(404).json({ 
        success: false,
        error: "Wishlist item not found" 
      });
    }
    
    // Check book availability
    const book = await Book.findById(wishlistItem.bookId._id);
    const available = book?.quantity > 0;
    
    const response = {
      _id: wishlistItem._id,
      userName: wishlistItem.userId?.name || "Unknown",
      userEmail: wishlistItem.userId?.email || "N/A",
      studentId: wishlistItem.userId?.studentId || "N/A",
      bookTitle: wishlistItem.bookId?.title || "Untitled",
      bookAuthor: wishlistItem.bookId?.author || "Unknown",
      courseCode: wishlistItem.bookId?.isbn || "N/A",
      price: wishlistItem.bookId?.price || 0,
      addedAt: wishlistItem.createdAt,
      updatedAt: wishlistItem.updatedAt,
      available: available,
      notes: wishlistItem.notes || "",
      userNotes: wishlistItem.userNotes || ""
    };
    
    res.json({
      success: true,
      ...response
    });
    
  } catch (error) {
    console.error("Get wishlist details error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to load wishlist details",
      message: error.message 
    });
  }
});

// ==================== CHARTS AND REPORTS ====================
// Get charts data
router.get("/charts", adminAuth, async (req, res) => {
  try {
    console.log("Fetching charts data");
    
    // Get last 6 months data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    // Monthly trend data
    const monthlyTrend = await getMonthlyTrendData(startDate, endDate);
    
    // Level distribution
    const levelDistribution = await getLevelDistributionData();
    
    // Sales report (book value by month)
    const salesReport = await getSalesReportData(startDate, endDate);
    
    res.json({
      success: true,
      monthlyTrend,
      levelDistribution,
      salesReport
    });
    
  } catch (error) {
    console.error("Charts data error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to load charts data",
      message: error.message 
    });
  }
});

// Helper functions for charts
async function getMonthlyTrendData(startDate, endDate) {
  const months = [];
  const booksData = [];
  const wishlistsData = [];
  const usersData = [];
  
  let currentDate = new Date(startDate);
  currentDate.setDate(1);
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    const monthName = currentDate.toLocaleString('default', { month: 'short' });
    months.push(`${monthName} ${year}`);
    
    // Books added in this month
    const booksCount = await Book.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    booksData.push(booksCount);
    
    // Wishlists added in this month
    const wishlistsCount = await Wishlist.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    wishlistsData.push(wishlistsCount);
    
    // Users registered in this month
    const usersCount = await User.countDocuments({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    });
    usersData.push(usersCount);
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return {
    labels: months,
    books: booksData,
    wishlists: wishlistsData,
    users: usersData
  };
}

async function getLevelDistributionData() {
  const levels = ["100", "200", "300", "400", "General"];
  const levelLabels = ["100 Level", "200 Level", "300 Level", "400 Level", "General"];
  
  const distribution = await Promise.all(
    levels.map(async (level) => {
      const query = level === "General" 
        ? { level: { $in: ["", null, undefined, "General"] } }
        : { level: level };
      
      const count = await Book.countDocuments(query);
      return count;
    })
  );
  
  return {
    labels: levelLabels,
    data: distribution
  };
}

async function getSalesReportData(startDate, endDate) {
  const months = [];
  const values = [];
  
  let currentDate = new Date(startDate);
  currentDate.setDate(1);
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    const monthName = currentDate.toLocaleString('default', { month: 'short' });
    months.push(`${monthName} ${year}`);
    
    // Calculate total book value for this month
    const valueResult = await Book.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalValue: { 
            $sum: { $multiply: ["$price", "$quantity"] }
          }
        }
      }
    ]);
    
    const totalValue = valueResult[0]?.totalValue || 0;
    values.push(totalValue);
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return {
    labels: months,
    values: values
  };
}

// Generate reports
router.get("/reports/generate", adminAuth, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    console.log(`Generating report from ${start} to ${end}`);
    
    // Parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD" 
      });
    }
    
    // Books report
    const booksReport = {
      totalBooks: await Book.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      allBooks: await Book.countDocuments(),
      newBooks: await Book.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      updatedBooks: await Book.countDocuments({
        updatedAt: { 
          $gte: startDate, 
          $lte: endDate,
          $ne: null 
        }
      }),
      totalCopies: (await Book.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: endDate } }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$quantity" }
          }
        }
      ]))[0]?.total || 0,
      totalValue: (await Book.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: endDate } }
        },
        {
          $group: {
            _id: null,
            total: { 
              $sum: { $multiply: ["$price", "$quantity"] }
            }
          }
        }
      ]))[0]?.total || 0
    };
    
    // Users report
    const usersReport = {
      totalUsers: await User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      allUsers: await User.countDocuments(),
      newUsers: await User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      activeUsers: await User.countDocuments({
        lastLogin: { $gte: startDate, $lte: endDate }
      }),
      adminUsers: await User.countDocuments({
        role: "admin",
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      studentUsers: await User.countDocuments({
        role: "student",
        createdAt: { $gte: startDate, $lte: endDate }
      })
    };
    
    // Wishlist report
    const wishlistReport = {
      totalWishlists: await Wishlist.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      allWishlists: await Wishlist.countDocuments(),
      newWishlists: await Wishlist.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      uniqueBooks: (await Wishlist.distinct("bookId", {
        createdAt: { $gte: startDate, $lte: endDate }
      })).length,
      activeUsers: (await Wishlist.distinct("userId", {
        createdAt: { $gte: startDate, $lte: endDate }
      })).length,
      avgPerUser: (await Wishlist.aggregate([
        {
          $match: { createdAt: { $gte: startDate, $lte: endDate } }
        },
        {
          $group: {
            _id: "$userId",
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            average: { $avg: "$count" }
          }
        }
      ]))[0]?.average || 0
    };
    
    res.json({
      success: true,
      booksReport,
      usersReport,
      wishlistReport
    });
    
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to generate report",
      message: error.message 
    });
  }
});

// ==================== ADMIN SETTINGS & PROFILE ====================
// Change password
router.post("/change-password", adminAuth, async (req, res) => {
  try {
    console.log("Changing password for admin:", req.admin.email);
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: "Current password and new password are required" 
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        error: "New password must be at least 8 characters long" 
      });
    }
    
    // Verify current password
    const user = await User.findById(req.admin._id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }
    
    // Check if password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        error: "Current password is incorrect" 
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();
    
    // Log activity
    await Activity.create({
      type: "password_changed",
      message: "Password changed successfully",
      adminId: req.admin._id
    });
    
    res.json({ 
      success: true,
      message: "Password changed successfully" 
    });
    
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to change password",
      message: error.message 
    });
  }
});

// Get admin profile
router.get("/profile", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.admin._id)
      .select("-password -__v");
    
    res.json({
      success: true,
      user: {
        ...user.toObject(),
        isAdmin: user.role === "admin"
      }
    });
    
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to load profile",
      message: error.message 
    });
  }
});

// Update admin profile
router.put("/profile", adminAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    updateData.updatedAt = new Date();
    
    const updatedUser = await User.findByIdAndUpdate(
      req.admin._id,
      updateData,
      { new: true }
    ).select("-password -__v");
    
    // Log activity
    await Activity.create({
      type: "profile_updated",
      message: "Admin profile updated",
      adminId: req.admin._id
    });
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
    
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update profile",
      message: error.message 
    });
  }
});

// Get system settings
router.get("/settings", adminAuth, async (req, res) => {
  try {
    // Return default settings
    const defaultSettings = {
      notifications: {
        email: true,
        system: true,
        newBooks: true,
        newUsers: true,
        wishlistActivity: true,
        lowStock: true
      },
      appearance: {
        theme: "auto",
        compactMode: false,
        sidebarCollapsed: false,
        itemsPerPage: 12,
        defaultBookView: "grid"
      },
      dateTime: {
        dateFormat: "relative",
        timeFormat: "12h"
      },
      security: {
        sessionTimeout: 60,
        autoBackup: false,
        backupRetention: 30,
        loginAlerts: true
      }
    };
    
    res.json({
      success: true,
      settings: defaultSettings
    });
    
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to load settings",
      message: error.message 
    });
  }
});

// Update system settings
router.put("/settings", adminAuth, async (req, res) => {
  try {
    const settings = req.body;
    
    // Log activity
    await Activity.create({
      type: "settings_updated",
      message: "System settings updated",
      adminId: req.admin._id
    });
    
    res.json({
      success: true,
      message: "Settings updated successfully",
      settings: settings
    });
    
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update settings",
      message: error.message 
    });
  }
});

// ==================== BACKUP & EXPORT ====================
// Create backup
router.post("/backup/create", adminAuth, async (req, res) => {
  try {
    console.log("Creating system backup");
    
    await Activity.create({
      type: "backup_created",
      message: "System backup created",
      adminId: req.admin._id
    });
    
    res.json({ 
      success: true,
      message: "Backup created successfully",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to create backup",
      message: error.message 
    });
  }
});

// Export data
router.get("/backup/export", adminAuth, async (req, res) => {
  try {
    console.log("Exporting system data");
    
    // Get all data
    const [books, users, wishlists, activities] = await Promise.all([
      Book.find().lean(),
      User.find().select("-password").lean(),
      Wishlist.find().lean(),
      Activity.find().lean()
    ]);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      exportedBy: req.admin.email,
      books,
      users,
      wishlists,
      activities
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=bookstore_backup_${Date.now()}.json`);
    
    res.json(exportData);
    
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to export data",
      message: error.message 
    });
  }
});

// ==================== HEALTH CHECK ====================
router.get("/health", (req, res) => {
  res.json({ 
    success: true,
    status: "healthy", 
    service: "admin-api",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;