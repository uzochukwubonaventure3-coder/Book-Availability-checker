const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  includesBook: {
    type: Boolean,
    default: false
  },
  includesCA: {
    type: Boolean,
    default: false
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    default: null
  },
  features: [{
    type: String,
    trim: true
  }],
  duration: {
    type: String,
    enum: ['one-time', 'semester', 'yearly'],
    default: 'one-time'
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update timestamp
packageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Package', packageSchema);