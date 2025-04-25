import jwt from "jsonwebtoken";
import { db } from "../db/dbconnection.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_strong_secret_key";

export const authMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET);

    // Verify user still exists
    const userRef = db.ref(`users/${decoded.userId}`);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    req.userId = decoded.userId;
    req.user = snapshot.val();
    next();
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Session expired",
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const { userId, deviceId } = decoded;

    // Verify refresh token exists in database
    const userRef = db.ref(`users/${userId}/refreshTokens/${deviceId}`);
    const snapshot = await userRef.once("value");
    const storedToken = snapshot.val();

    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Invalid session",
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: "15m",
    });

    // Set new access token in cookie
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    req.userId = userId;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      // Clear expired refresh token
      res.clearCookie("refreshToken");
    }
    next(error);
  }
};
