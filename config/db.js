const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      // options are mostly auto-managed in Mongoose v8+
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
