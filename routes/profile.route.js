import express from "express";
const router = express.Router();

// Profile routes
router.get("/", (req, res) => {
  res.json({ message: "Profile data" });
});

export default router;
