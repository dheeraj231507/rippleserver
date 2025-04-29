import express from "express";
import { getUserAnalyses } from "../controllers/gallery.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected route to get user analyses
router.get("/user", authMiddleware, getUserAnalyses);

export default router;
