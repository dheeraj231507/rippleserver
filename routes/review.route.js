import express from "express";
const router = express.Router();

// Review routes
router.get("/", (req, res) => {
  res.json({ message: "Review data" });
});

export default router;
