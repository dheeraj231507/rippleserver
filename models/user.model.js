// User model structure for Firebase
class User {
  constructor(data) {
    this.name = data.name || "";
    this.email = data.email || "";
    this.password = data.password || ""; // Note: In production, never store plain passwords
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  toFirestore() {
    return {
      name: this.name,
      email: this.email,
      password: this.password, // Include the hashed password
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default User;
