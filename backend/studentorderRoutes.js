const express = require('express');
const router = express.Router();
const auth = require('./authMiddleware');
const Order = require('./OrderModel');
const CaBooking = require('./CaBookingModel');

// Get student orders
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load orders' 
    });
  }
});

// Get single order details
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load order' 
    });
  }
});

// Get student CA booking
router.get('/ca-booking', auth, async (req, res) => {
  try {
    const booking = await CaBooking.findOne({ 
      userId: req.user.id,
      status: { $in: ['scheduled', 'pending'] }
    })
    .populate('packageId', 'name')
    .sort({ scheduledDate: -1 });

    if (!booking) {
      return res.json({
        success: true,
        data: null,
        message: 'No active CA booking found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get CA booking error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load CA booking' 
    });
  }
});

// Get all CA bookings (for student)
router.get('/ca-bookings', auth, async (req, res) => {
  try {
    const bookings = await CaBooking.find({ userId: req.user.id })
      .populate('packageId', 'name')
      .sort({ scheduledDate: -1 });

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

module.exports = router;