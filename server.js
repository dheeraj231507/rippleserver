import express from "express";
import cookieParser from "cookie-parser";
import {
  authMiddleware,
  refreshAccessToken,
} from "./middleware/auth.middleware.js";
import { v2 as cloudinary } from "cloudinary";
import { OpenAI } from "openai";
import userRoutes from "./routes/user.route.js";
import photoRoutes from "./routes/photo.route.js";
import { db } from "./db/dbconnection.js";
import dotenv from "dotenv"; // Import dotenv
import cors from "cors";
import galleryRoutes from "./routes/gallery.route.js"; // Import gallery routes

// Configure dotenv
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  if (!db) {
    return res.status(500).json({ error: "Database connection failed!" });
  }
  next();
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/photos", photoRoutes); // Add photo routes
app.use("/api/gallery", galleryRoutes); // Add gallery routes

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Token expired",
    });
  }
  // Default error handler
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
