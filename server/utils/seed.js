require('dotenv').config({ path: '../.env' }); // Look up one level since it runs from server/utils
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college-event-db';
    console.log(`Connecting to database for seeding at: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Seeder: Admin user already exists. Seeding skipped.');
      if (require.main === module) {
        process.exit(0);
      }
      return;
    }

    // Create default Admin
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@college.edu',
      password: 'admin123', // Will be hashed by UserSchema pre-save hook
      role: 'admin',
    });

    console.log('\n----------------------------------------');
    console.log('Seeder: Default admin created successfully!');
    console.log(`Email: ${adminUser.email}`);
    console.log('Password: admin123');
    console.log('----------------------------------------\n');

    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Seeding error:', error.message);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

// Check if run directly
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
