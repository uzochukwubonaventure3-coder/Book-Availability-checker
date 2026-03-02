const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./UserModel"); // EXACT same model path

async function addAdmin() {
  try {
    await mongoose.connect("mongodb://localhost:27017/book_availability");

    // check if admin already exists
    const existingAdmin = await User.findOne({
      email: "bonaventure@gmail.com"
    });

    if (existingAdmin) {
      console.log("Admin already exists in users collection");
      return mongoose.disconnect();
    }

    const hashedPassword = await bcrypt.hash("bona savage", 10);

    await User.create({
      name: "Bonaventure",
      email: "bonaventure@gmail.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("Admin added to existing users collection");
    mongoose.disconnect();

  } catch (err) {
    console.error("Error:", err);
  }
}

addAdmin();
