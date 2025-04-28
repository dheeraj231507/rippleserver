import admin from "firebase-admin";

class AnalysisPhoto {
  constructor({ analysis, imageUrl, userId, exifData, createdAt = null }) {
    this.analysis = analysis; // Analysis result from OpenAI
    this.imageUrl = imageUrl; // Public URL of the uploaded image
    this.userId = userId; // ID of the user who uploaded the image
    this.exifData = {
      Model: exifData?.Model || null,
      LensModel: exifData?.LensModel || null,
      FocalLength: exifData?.FocalLength || null,
      ShutterSpeedValue: exifData?.ShutterSpeedValue || null,
      ApertureValue: exifData?.ApertureValue || null,
      ISO: exifData?.ISO || null,
    }; // Only store required EXIF data
    this.createdAt = createdAt || admin.firestore.FieldValue.serverTimestamp(); // Timestamp of creation
  }

  // Convert the analysis object to Firestore format
  toFirestore() {
    return {
      analysis: this.analysis,
      imageUrl: this.imageUrl,
      userId: this.userId,
      exifData: this.exifData,
      createdAt: this.createdAt,
    };
  }

  // Create an analysis object from Firestore data
  static fromFirestore(data) {
    return new AnalysisPhoto({
      analysis: data.analysis,
      imageUrl: data.imageUrl,
      userId: data.userId,
      exifData: data.exifData,
      createdAt: data.createdAt,
    });
  }
}

export default AnalysisPhoto;
