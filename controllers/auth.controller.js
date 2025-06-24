import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/dbconnection.js";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";
const SALT_ROUNDS = 10;

// Helper functions
const generateTokens = (userId, deviceId) => {
  const accessToken = jwt.sign({ userId, deviceId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ userId, deviceId }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
};

// Controller methods
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user using the User model
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      refreshTokens: {},
    });

    // Save user to Firestore
    await db.collection("users").add(newUser.toFirestore());

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceId = uuidv4();

    // Find user
    const snapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const userDoc = snapshot.docs[0];
    const user = User.fromFirestore(userDoc.data());
    const userId = userDoc.id;

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId, deviceId);

    // Store refresh token
    user.refreshTokens[deviceId] = refreshToken;
    await db.collection("users").doc(userId).update(user.toFirestore());

    // Set HTTP-only cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      message: "Login successful",
      userId,
      deviceId,
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const { userId, deviceId } = decoded;

    // Verify refresh token exists in DB
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = User.fromFirestore(userDoc.data());
    const storedToken = user.refreshTokens?.[deviceId];

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const { accessToken } = generateTokens(userId, deviceId);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    res
      .status(401)
      .json({ message: "Token refresh failed", error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { userId, deviceId } = req.user;

    // Remove refresh token from DB
    const userDoc = await db.collection("users").doc(userId).get();
    const user = User.fromFirestore(userDoc.data());
    delete user.refreshTokens[deviceId];

    await db.collection("users").doc(userId).update(user.toFirestore());

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};

export const logoutAll = async (req, res) => {
  try {
    const { userId } = req.user;

    // Remove all refresh tokens
    const userDoc = await db.collection("users").doc(userId).get();
    const user = User.fromFirestore(userDoc.data());
    user.refreshTokens = {};

    await db.collection("users").doc(userId).update(user.toFirestore());

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out from all devices" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};
