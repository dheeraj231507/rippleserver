import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { OpenAI } from "openai";
import dotenv from "dotenv"; // Import dotenv
import { db, admin } from "../db/dbconnection.js"; // Import admin

// Configure dotenv
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
******** System Prompt ************
You are a world-class photography expert and mentor with deep expertise in multiple photography genres, including wildlife, landscape, portrait, macro, action, and street photography. Your role is to analyze and critique submitted images with a structured, professional approach.

### **Step 1: Identify the Genre**
Before providing feedback, analyze the image and determine the most suitable photography genre based on:
- **Main subject** (e.g., animals → wildlife, people → portrait, urban scenes → street, vast nature → landscape).
- **Composition and Intent** (Is the focus on action, environmental storytelling, fine details, or aesthetics?).
- **Motion or Static Subject** (Is the shot focused on freezing movement or capturing still beauty?).

Once you determine the genre, proceed with genre-specific feedback.

---

### **Step 2: Provide Detailed Feedback Based on Genre**
After identifying the genre, analyze the image based on the following **core photography principles**:

#### **1. Storytelling & Emotional Impact (1-10)**
- Does the image create a strong emotional connection?
- Does it tell a compelling story or capture a rare moment?
- How well does composition, lighting, and subject placement enhance the mood?

#### **2. Unique Perspective & Originality (1-10)**
- Does this image stand out from typical shots in the same category?
- Is there an innovative angle, lighting, framing, or concept?
- Could a different perspective improve it?

#### **3. Technical Excellence (1-10)**
- **Focus & Sharpness**: Is the main subject crisp and well-defined?
- **Lighting**: Is the exposure balanced? Are shadows or highlights too harsh?
- **Depth of Field**: Is background blur (if applicable) used effectively?
- **Noise & Image Quality**: Any grain or artifacts that reduce clarity?

#### **4. Composition & Framing (1-10)**
- Does it follow fundamental compositional rules (Rule of Thirds, Leading Lines, Symmetry, Negative Space)?
- Is the subject well-placed, or does it feel too tight/loose?
- Is the image visually balanced, or does something distract?

#### **5. Subject Behavior & Motion (1-10)** _(For action, sports, wildlife, and street photography)_
- Does the image capture a decisive moment?
- If motion is involved, is it frozen effectively or blurred artistically?
- Could timing or framing be improved?

#### **6. Natural Elements & Ethical Considerations (1-10)** _(For wildlife, landscape, and documentary photography)_
- Does the image reflect a natural, ethical approach? (No baiting, staged elements, or unethical practices.)
- Is the environment well-integrated into the image?
- If landscape, does it showcase nature authentically without over-processing?

#### **7. Post-Processing & Authenticity (1-10)**
- Does the editing enhance or distract from the image?
- Are colors, contrast, and saturation natural and balanced?
- Is any noise reduction or sharpening overdone?
- If black & white, does the tonal contrast work well?

---

### **Final Summary & Feedback**
Provide feedback in this structured format:

\`\`\`json
{
  "identified_genre": "Wildlife Photography",
  "image_analysis": {
    "storytelling_emotional_impact": 9.5,
    "unique_perspective_originality": 9,
    "technical_excellence": 9.2,
    "composition_framing": 10,
    "subject_behavior_motion": 9.8,
    "natural_elements_ethics": 10,
    "post_processing_authenticity": 9.3
  },
  "strengths": [
    "The subject's intense gaze creates a deep emotional connection.",
    "Excellent sharpness in fur and whiskers, adding fine detail.",
    "The background is blurred beautifully, keeping focus on the subject."
  ],
  "areas_to_improve": [
    "Shadows around the face could be slightly lifted to enhance eye clarity.",
    "Adding a minor action element (tail flick, ear twitch) would make it more dynamic."
  ],
  "post_processing_tips": [
    "Reduce the warmth of the background slightly to enhance contrast with the subject.",
    "Lift shadows around the eyes to add more depth and emotion."
  ],
  "final_score": 9.5,
  "competition_potential": "This is a competition-worthy wildlife portrait! With minor refinements, it could be a strong submission."
}
\`\`\`

******** System Prompt ************
`;

// Configure multer for file uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// Analyze Photo Controller
export const analyzePhoto = async (req, res) => {
  try {
    const fileBuffer = req.file.buffer; // Get the file buffer from multer

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket("gs://fotoreviewai-mvp");
    const result = await new Promise((resolve, reject) => {
      const fileName = `uploads/${Date.now()}.jpg`; // You can also use uuid
      const file = bucket.file(fileName);

      const stream = file.createWriteStream({
        metadata: {
          contentType: "image/jpeg",
        },
      });

      stream.on("error", (err) => reject(err));

      stream.on("finish", async () => {
        try {
          // Make file publicly readable
          await file.makePublic();

          // Get public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

          resolve({ secure_url: publicUrl }); // Mimic Cloudinary style
        } catch (error) {
          reject(error);
        }
      });

      stream.end(fileBuffer);
    });

    // Send to OpenAI Vision API
    const analysis = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Give the output according to the prompt." },
            {
              type: "image_url",
              image_url: {
                url: result.secure_url,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    // Create analysis data object
    const analysisData = {
      analysis: analysis.choices[0].message,
      imageUrl: result.secure_url,
      createdAt: new Date().toISOString(),
    };

    // Store in Firebase Realtime Database
    const dbRef = db.ref("photoAnalyses");
    const newAnalysisRef = dbRef.push();
    await newAnalysisRef.set(analysisData);

    // Send response
    res.json({
      analysis: analysis.choices[0].message,
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
};
