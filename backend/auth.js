const express = require("express");
const router = express.Router();
const User = require("./UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// SECRET FOR JWT
const JWT_SECRET = "your_jwt_secret_here"; // replace with env variable in production

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });

    res.json({ token, role: user.role, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password (authenticated)
const { auth } = require('../middleware/auth');
router.post('/change-password', auth, async (req,res)=>{
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    const bcrypt = require('bcryptjs');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Current password wrong' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed' });
  } catch (err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
