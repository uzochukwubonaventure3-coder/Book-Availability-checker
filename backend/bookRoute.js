const express = require("express");
const router = express.Router();
const Book = require("./BookModel");
const auth = require("./authMiddleware");

// Add Book
router.post("/add-book", async (req, res) => {
  try {
    const { title, author, isbn, quantity,  price } = req.body;
    const newBook = new Book({ title, author, isbn, quantity, price });
    await newBook.save();
    res.status(201).json({ message: "Book added successfully", book: newBook });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all Books
router.get("/books", async (req, res) => {
  const books = await Book.find();
  res.json(books);
});

// Delete Book
router.delete("/book/:id", async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: "Book deleted successfully" });
});

router.put("/edit-book/:id", async (req, res) => {
  try {
    const { title, author, isbn, quantity, price } = req.body;
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, isbn, quantity, price },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({ message: "book updated successfully!", updatedBook });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
