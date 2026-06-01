let admin;
const { createRequire } = require("module");
const { join } = require("path");

function getAdmin() {
  if (!admin) {
    try {
      admin = require("firebase-admin");
    } catch (error) {
      const backendRequire = createRequire(join(__dirname, "..", "..", "..", "fabis.laços", "server.js"));
      admin = backendRequire("firebase-admin");
    }
  }
  return admin;
}

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || "";
  return raw.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } catch {
      return null;
    }
  }
}

function getFirebaseAdminApp() {
  const adminSdk = getAdmin();
  if (adminSdk.apps.length) return adminSdk.app();

  const serviceAccount = getServiceAccountFromEnv();
  if (serviceAccount?.project_id && serviceAccount?.client_email && serviceAccount?.private_key) {
    return adminSdk.initializeApp({
      credential: adminSdk.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: String(serviceAccount.private_key).replace(/\\n/g, "\n")
      }),
      projectId: serviceAccount.project_id
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (projectId && clientEmail && privateKey) {
    return adminSdk.initializeApp({
      credential: adminSdk.credential.cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return adminSdk.initializeApp({
      credential: adminSdk.credential.applicationDefault(),
      projectId: projectId || "fabis-lacos"
    });
  }

  throw new Error("Firebase Admin SDK sem FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
}

function getDb() {
  getFirebaseAdminApp();
  return getAdmin().firestore();
}

module.exports = {
  getAdmin,
  getDb
};
