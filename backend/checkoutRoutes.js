const express = require('express');
const router = express.Router();
const auth = require('./authMiddleware');
const Order = require('./OrderModel');
const Book = require('./BookModel');
const Package = require('./PackageModel');
const CaBooking = require('./CaBookingModel');
const crypto = require('crypto');
const axios = require('axios');

// Initialize Paystack payment
router.post('/initialize', auth, async (req, res) => {
  try {
    const { items, deliveryAddress, phone, notes } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!items || !items.length || !deliveryAddress || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Validate and calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (item.itemType === 'book') {
        const book = await Book.findById(item.itemId);
        if (!book) {
          return res.status(404).json({ 
            success: false, 
            message: `Book not found: ${item.itemId}` 
          });
        }
        if (book.stock < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: `Insufficient stock for: ${book.title}` 
          });
        }
        
        const total = book.price * item.quantity;
        subtotal += total;
        
        validatedItems.push({
          itemType: 'book',
          itemId: book._id,
          itemModel: 'Book',
          name: book.title,
          quantity: item.quantity,
          price: book.price,
          total
        });
      } else if (item.itemType === 'package') {
        const package = await Package.findById(item.itemId);
        if (!package) {
          return res.status(404).json({ 
            success: false, 
            message: `Package not found: ${item.itemId}` 
          });
        }
        if (!package.isActive) {
          return res.status(400).json({ 
            success: false, 
            message: `Package not available: ${package.name}` 
          });
        }
        
        const total = package.price * item.quantity;
        subtotal += total;
        
        validatedItems.push({
          itemType: 'package',
          itemId: package._id,
          itemModel: 'Package',
          name: package.name,
          quantity: item.quantity,
          price: package.price,
          total,
          includesCA: package.includesCA,
          includesBook: package.includesBook
        });
      }
    }

    // Create order
    const order = new Order({
      userId,
      items: validatedItems,
      subtotal,
      totalAmount: subtotal, // Add shipping/tax logic if needed
      status: 'pending',
      paymentStatus: 'pending',
      deliveryAddress,
      phone,
      notes
    });

    await order.save();

    // Initialize Paystack payment
    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: req.user.email,
      amount: Math.round(order.totalAmount * 100), // Paystack uses kobo
      reference: `ORD-${order._id}-${Date.now()}`,
      callback_url: `${process.env.FRONTEND_URL}/payment-callback.html`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        items: validatedItems.map(i => ({
          type: i.itemType,
          id: i.itemId.toString(),
          name: i.name,
          quantity: i.quantity
        }))
      }
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.status) {
      // Update order with payment reference
      order.paymentReference = response.data.data.reference;
      await order.save();

      res.json({
        success: true,
        data: {
          authorization_url: response.data.data.authorization_url,
          reference: response.data.data.reference,
          orderId: order._id
        }
      });
    } else {
      throw new Error('Paystack initialization failed');
    }

  } catch (error) {
    console.error('Checkout initialize error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initialize payment' 
    });
  }
});

// Paystack webhook
router.post('/paystack-webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    const event = req.body;

    // Handle successful payment
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const metadata = event.data.metadata;

      // Find and update order
      const order = await Order.findById(metadata.orderId);
      if (!order) {
        return res.status(404).json({ 
          success: false, 
          message: 'Order not found' 
        });
      }

      // Update order status
      order.status = 'paid';
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.paymentReference = reference;
      await order.save();

      // Update book stock
      for (const item of order.items) {
        if (item.itemType === 'book') {
          await Book.findByIdAndUpdate(item.itemId, {
            $inc: { stock: -item.quantity }
          });
        }
      }

      // Create CA bookings for packages that include CA
      const caBookings = [];
      for (const item of order.items) {
        if (item.itemType === 'package') {
          const package = await Package.findById(item.itemId);
          if (package && package.includesCA) {
            // Schedule CA for 7 days from now at 10 AM
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 7);
            scheduledDate.setHours(10, 0, 0, 0);

            const booking = new CaBooking({
              userId: metadata.userId,
              orderId: order._id,
              packageId: package._id,
              scheduledDate,
              status: 'scheduled'
            });

            await booking.save();
            caBookings.push(booking);
          }
        }
      }

      console.log(`Payment successful for order ${order.orderNumber}`);
    }

    res.json({ 
      success: true,
      message: 'Webhook received' 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed' 
    });
  }
});

// Verify payment status
router.get('/verify/:reference', auth, async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    if (response.data.status) {
      const order = await Order.findOne({ paymentReference: reference });
      
      res.json({
        success: true,
        data: {
          status: response.data.data.status,
          orderStatus: order ? order.status : 'unknown',
          orderNumber: order ? order.orderNumber : null
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Payment verification failed'
      });
    }

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment' 
    });
  }
});

module.exports = router;