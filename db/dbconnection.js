import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../RippleShotAI1.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fotoreviewai-mvp-default-rtdb.firebaseio.com/",
});

const db = admin.firestore(); // Changed to Firestore
const bucket = admin.storage().bucket("gs://fotoreviewai-mvp");

export { db, admin, bucket };
