const express = require('express');
const router = express.Router();
const auth = require('./authMiddleware');
const Book = require('./BookModel');
const Package = require('./PackageModel');

// Add to cart (stores in memory, client will use localStorage)
router.post('/add', auth, async (req, res) => {
  try {
    const { itemType, itemId, quantity = 1 } = req.body;
    
    if (!itemType || !itemId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item type and ID are required' 
      });
    }

    let item = null;
    let price = 0;
    let name = '';

    // Validate item exists and get price
    if (itemType === 'book') {
      item = await Book.findById(itemId);
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Book not found' 
        });
      }
      if (item.stock < quantity) {
        return res.status(400).json({ 
          success: false, 
          message: 'Insufficient stock' 
        });
      }
      price = item.price;
      name = item.title;
    } else if (itemType === 'package') {
      item = await Package.findById(itemId);
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Package not found' 
        });
      }
      if (!item.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: 'Package is not available' 
        });
      }
      price = item.price;
      name = item.name;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid item type' 
      });
    }

    res.json({
      success: true,
      message: 'Item validated successfully',
      data: {
        itemType,
        itemId,
        name,
        price,
        quantity,
        total: price * quantity
      }
    });

  } catch (error) {
    console.error('Cart add error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;