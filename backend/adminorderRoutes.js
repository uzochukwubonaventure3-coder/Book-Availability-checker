const express = require('express');
const router = express.Router();
const auth = require('./authMiddleware');
const Order = require('./OrderModel');
const CaBooking = require('./CaBookingModel');

// Admin middleware (simplified - you should implement proper admin auth)
const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Get all orders (admin)
router.get('/orders', auth, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load orders' 
    });
  }
});

// Update order status (admin)
router.patch('/orders/:id', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const updateData = { status };
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order' 
    });
  }
});

// Get all CA bookings (admin)
router.get('/ca-bookings', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) query.status = status;

    const bookings = await CaBooking.find(query)
      .populate('userId', 'name email phone')
      .populate('packageId', 'name')
      .populate('orderId', 'orderNumber')
      .sort({ scheduledDate: 1 });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Get CA bookings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load CA bookings' 
    });
  }
});

// Update CA booking (admin)
router.put('/ca-booking/:id', auth, isAdmin, async (req, res) => {
  try {
    const { scheduledDate, status } = req.body;
    
    const updateData = {};
    if (scheduledDate) updateData.scheduledDate = scheduledDate;
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    const booking = await CaBooking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'CA Booking not found' 
      });
    }

    res.json({
      success: true,
      data: booking,
      message: 'CA Booking updated successfully'
    });
  } catch (error) {
    console.error('Update CA booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update CA booking' 
    });
  }
});

module.exports = router;