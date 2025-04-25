import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  getCurrentUser,
} from "../controllers/user.controllers.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshToken);

// Protected routes
router.post("/logout", authMiddleware, logoutUser);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
