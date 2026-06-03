const express = require('express');
const router = express.Router();
const auth = require('./authMiddleware');
const Package = require('./PackageModel');

// Get all active packages
router.get('/', auth, async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true })
      .populate('bookId', 'title author price')
      .sort({ price: 1 });
    
    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load packages' 
    });
  }
});

// Get single package
router.get('/:id', auth, async (req, res) => {
  try {
    const package = await Package.findById(req.params.id)
      .populate('bookId', 'title author price');
    
    if (!package) {
      return res.status(404).json({ 
        success: false, 
        message: 'Package not found' 
      });
    }
    
    res.json({
      success: true,
      data: package
    });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load package' 
    });
  }
});

module.exports = router;