import { db } from "../db/dbconnection.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "your_strong_secret_key";

// Register User
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Check if user exists
    const usersRef = db.ref("users");
    const snapshot = await usersRef
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (snapshot.exists()) {
      return res.status(409).json({
        success: false,
        error: "Email already registered",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUserRef = usersRef.push();
    await newUserRef.set({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      refreshTokens: {}, // Initialize empty refresh tokens
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Login User
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find user
    const usersRef = db.ref("users");
    const snapshot = await usersRef
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (!snapshot.exists()) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Get user data
    const userKey = Object.keys(snapshot.val())[0];
    const user = snapshot.val()[userKey];
    const userId = userKey;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate device ID
    const deviceId = uuidv4();

    // Generate tokens
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId, deviceId }, JWT_SECRET, {
      expiresIn: "30d",
    });

    // Save refresh token to database
    await db.ref(`users/${userId}/refreshTokens/${deviceId}`).set(refreshToken);

    // Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Don't send sensitive data in response
    const userResponse = {
      id: userId,
      name: user.name,
      email: user.email,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Logout User
export const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "No session found",
      });
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        const { userId, deviceId } = decoded;

        // Remove refresh token from database
        await db.ref(`users/${userId}/refreshTokens/${deviceId}`).remove();
      } catch (error) {
        // Even if token verification fails, proceed with logout
        console.log("Token verification failed during logout:", error.message);
      }
    }
    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    // Even if token is invalid, clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    next(error);
  }
};

// Refresh Token
export const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: "No refresh token provided",
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
        error: "Invalid refresh token",
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

    // Get user data
    const userSnapshot = await db.ref(`users/${userId}`).once("value");
    const user = userSnapshot.val();

    // Don't send sensitive data
    const userResponse = {
      id: userId,
      name: user.name,
      email: user.email,
    };

    res.status(200).json({
      success: true,
      message: "Token refreshed",
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

// Get Current User
export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.userId;
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once("value");
    const user = snapshot.val();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Don't send sensitive data
    const userResponse = {
      id: userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};
