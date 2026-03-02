const express = require("express");
const router = express.Router();
const Book = require("./BookModel");
const Wishlist = require("./WishlistModel"); // You'll need to create this
const auth = require("./authMiddleware");

// Student – Get all books (Protected)
router.get("/books", auth, async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Failed to load books" });
  }
});

// Student – Search books
router.get("/search", auth, async (req, res) => {
  try {
    const { q } = req.query;

    const books = await Book.find({
      $or: [
        { code: { $regex: q, $options: "i" } },
        { title: { $regex: q, $options: "i" } },
        { author: { $regex: q, $options: "i" } }
      ]
    });

    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
});

// Student – Add to wishlist
router.post("/wishlist", auth, async (req, res) => {
  try {
    const { bookId, title, isbn } = req.body;
    const userId = req.user.id; // From auth middleware
    
    const wishlistItem = new Wishlist({
      userId,
      bookId,
      title,
      isbn,
      addedAt: new Date()
    });
    
    await wishlistItem.save();
    
    // You can also notify admins here via WebSocket or database flag
    
    res.json({ 
      success: true, 
      message: "Added to wishlist" 
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
});

// Student – Get my wishlist
router.get("/wishlist", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const wishlist = await Wishlist.find({ userId })
      .sort({ addedAt: -1 })
      .populate('bookId', 'title author code price');
    
    res.json(wishlist);
  } catch (err) {
    res.status(500).json({ message: "Failed to load wishlist" });
  }
});

// Student – Remove from wishlist
router.delete("/wishlist/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    await Wishlist.findOneAndDelete({ 
      _id: id, 
      userId 
    });
    
    res.json({ 
      success: true, 
      message: "Removed from wishlist" 
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
});

module.exports = router;