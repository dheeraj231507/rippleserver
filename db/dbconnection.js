import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../RippleShotAI1.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fotoreviewai-mvp-default-rtdb.firebaseio.com/",
});

const db = admin.database(); // For Realtime Database

export { db, admin };
