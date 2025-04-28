import admin from "firebase-admin";

class User {
  constructor({ name, email, password, refreshTokens, createdAt, updatedAt }) {
    this.name = name; // User's name
    this.email = email; // User's email
    this.password = password; // Hashed password
    this.refreshTokens = refreshTokens || {}; // Refresh tokens mapped by device ID
    this.createdAt = createdAt || admin.firestore.FieldValue.serverTimestamp(); // Creation timestamp
    this.updatedAt = updatedAt || admin.firestore.FieldValue.serverTimestamp(); // Last updated timestamp
  }

  // Convert the user object to Firestore format
  toFirestore() {
    return {
      name: this.name,
      email: this.email,
      password: this.password,
      refreshTokens: this.refreshTokens,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Create a user object from Firestore data
  static fromFirestore(data) {
    return new User({
      name: data.name,
      email: data.email,
      password: data.password,
      refreshTokens: data.refreshTokens,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}

export default User;
