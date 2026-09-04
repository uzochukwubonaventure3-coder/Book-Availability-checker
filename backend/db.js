const mongoose = require('mongoose');

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  try {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/book_availability";

    connectionPromise = mongoose.connect(uri).then(() => {
      console.log("MongoDB Connected Successfully");
      return mongoose.connection;
    });

    return await connectionPromise;
  } catch (err) {
    connectionPromise = undefined;
    console.error("MongoDB Connection Failed:", err.message);
    throw err;
  }
};

module.exports = connectDB;
