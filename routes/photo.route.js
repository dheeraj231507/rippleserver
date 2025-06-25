import express from "express";
import {
  upload,
  analyzePhoto,
} from "../controllers/analysisPhoto.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Photo analysis route (protected)
router.post(
  "/analyze-photo",
  authMiddleware,
  upload.single("image"),
  analyzePhoto
);

export default router;
