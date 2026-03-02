const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'book_added',
            'book_updated',
            'book_deleted',
            'book_availability_updated',  // Add this
            'user_registered',
            'wishlist_added',
            'wishlist_removed',  // Add this
            'password_changed',
            'profile_updated',
            'settings_updated',
            'backup_created'
        ],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Activity', activitySchema);