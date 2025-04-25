import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/dbconnection.js";

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
    const usersRef = db.ref("users");
    const snapshot = await usersRef
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (snapshot.exists()) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const newUserRef = usersRef.push();
    await newUserRef.set({
      name,
      email,
      password: hashedPassword,
      refreshTokens: {},
    });

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
    const usersRef = db.ref("users");
    const snapshot = await usersRef
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (!snapshot.exists()) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const userData = Object.values(snapshot.val())[0];
    const userId = Object.keys(snapshot.val())[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userId, deviceId);

    // Store refresh token
    await usersRef
      .child(`${userId}/refreshTokens/${deviceId}`)
      .set(refreshToken);

    // Set HTTP-only cookies
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
    const userRef = db.ref(`users/${userId}/refreshTokens/${deviceId}`);
    const snapshot = await userRef.once("value");
    const storedToken = snapshot.val();

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const { accessToken } = generateTokens(userId, deviceId);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
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
    await db.ref(`users/${userId}/refreshTokens/${deviceId}`).remove();

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
    await db.ref(`users/${userId}/refreshTokens`).remove();

    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out from all devices" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed", error: error.message });
  }
};
