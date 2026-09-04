const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const authRoutes = require("./authRoute");
const adminRoutes = require("./adminRoute");
const studentRoutes = require("./studentroute");
const cartRoutes = require("./cartRoutes");
const packageRoutes = require("./packageRoutes");
const checkoutRoutes = require("./checkoutRoutes");
const studentOrderRoutes = require("./studentOrderRoutes");
const adminOrderRoutes = require("./adminOrderRoutes");
require("dotenv").config();

const app = express();

// CORS Configuration
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
    "http://127.0.0.1:5503", 
    "http://localhost:5500",
    "http://localhost:5501",
    "http://localhost:5503",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure database-backed routes wait for a connection in serverless invocations.
app.use(async (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch {
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/cart",  cartRoutes); // Protected cart routes
app.use("/api/packages",  packageRoutes);
app.use("/api/checkout", checkoutRoutes); // Webhook doesn't need auth
app.use("/api/student",  studentOrderRoutes);
app.use("/api/admin",  adminOrderRoutes); // Admin routes

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "UNN BookStore API"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.url 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

module.exports = app;

// Vercel imports the app as a serverless function; local development runs it directly.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`UNN BookStore Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}