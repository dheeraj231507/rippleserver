import express from "express";
const router = express.Router();

// Upload routes
router.post("/", (req, res) => {
  res.json({ message: "File uploaded successfully" });
});

export default router;
