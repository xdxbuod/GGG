let admin;

function getAdmin() {
  if (!admin) admin = require("firebase-admin");
  return admin;
}

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || "";
  return raw.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function getFirebaseAdminApp() {
  const adminSdk = getAdmin();
  if (adminSdk.apps.length) return adminSdk.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin SDK sem FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ou FIREBASE_PRIVATE_KEY.");
  }

  return adminSdk.initializeApp({
    credential: adminSdk.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

function getDb() {
  getFirebaseAdminApp();
  return getAdmin().firestore();
}

module.exports = {
  getAdmin,
  getDb
};
