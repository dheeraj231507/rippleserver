import { db } from "../db/dbconnection.js";

export const getUserAnalyses = async (req, res) => {
  try {
    const userId = req.userId; // Get authenticated user's ID from the request

    // Query Firestore for analyses belonging to the user
    const snapshot = await db
      .collection("photoAnalyses")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    // Map the results to include required fields
    const analyses = snapshot.docs.map((doc) => ({
      id: doc.id,
      imageUrl: doc.data().imageUrl,
      analysis: doc.data().analysis,
      exifData: doc.data().exifData,
      createdAt: doc.data().createdAt,
    }));

    // Respond with the analyses
    res.status(200).json({
      success: true,
      analyses: analyses.map((item) => ({
        analysis: item.analysis,
        imageUrl: item.imageUrl,
        exifData: item.exifData,
      })),
    });
  } catch (error) {
    console.error("Error fetching user analyses:", error.message);
    res.status(500).json({ success: false, error: "Failed to fetch analyses" });
  }
};
