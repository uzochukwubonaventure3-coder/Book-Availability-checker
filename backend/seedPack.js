const mongoose = require('mongoose');
const Package = require('./PackageModel');
require('dotenv').config();

const seedPackages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clear existing packages
    await Package.deleteMany({});
    
    const packages = [
      {
        name: 'Basic Book Package',
        description: 'Get your required textbook at the best price',
        price: 5000,
        includesBook: true,
        includesCA: false,
        features: [
          'Physical textbook delivery',
          'Digital copy included',
          '24/7 access to resources',
          'Student discount applied'
        ]
      },
      {
        name: 'Premium Package (Book + CA)',
        description: 'Complete academic support with book and CA filling service',
        price: 15000,
        includesBook: true,
        includesCA: true,
        features: [
          'Physical textbook delivery',
          'Digital copy included',
          'CA filling service for all courses',
          'Priority support',
          'Free past questions',
          'Study guide included'
        ]
      },
      {
        name: 'CA Filling Service Only',
        description: 'Professional CA filling service for all your courses',
        price: 8000,
        includesBook: false,
        includesCA: true,
        features: [
          'CA filling for all registered courses',
          'Verified by academic staff',
          'Results tracking',
          'Email notifications'
        ]
      }
    ];
    
    await Package.insertMany(packages);
    console.log('Packages seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding packages:', error);
    process.exit(1);
  }
};

seedPackages();