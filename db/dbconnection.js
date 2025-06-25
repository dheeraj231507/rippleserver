import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../RippleShotAi.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rippleshotai-default-rtdb.firebaseio.com/",
});

const db = admin.firestore(); // Changed to Firestore
//const bucket = admin.storage().bucket("gs://fotoreviewai-mvp");

export { db, admin };
