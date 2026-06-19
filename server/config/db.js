const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college-event-db';
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Primary MongoDB Connection Error: ${error.message}`);
    console.log('Starting fallback in-memory MongoDB Server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Fallback In-Memory MongoDB Connected: ${conn.connection.host}`);
    
    // We update the env variable so other places (like seed.js) use the memory DB.
    process.env.MONGO_URI = mongoUri; 
  }
};

module.exports = connectDB;
