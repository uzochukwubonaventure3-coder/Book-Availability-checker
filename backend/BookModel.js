const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  isbn: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  courseTitle: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['science', 'arts', 'business', 'law', 'medicine', 'general'],
    default: 'general'
  },
  description: {
    type: String,
    trim: true
  },
  coverImage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
bookSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for checking if book is in stock
bookSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// Ensure virtuals are included in JSON output
bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);