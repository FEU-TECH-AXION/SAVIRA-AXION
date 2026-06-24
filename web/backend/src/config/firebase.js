// SAVIRA/web/backend/src/config/firebase.js
const fs = require('fs');
const path = require('path');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging: getAdminMessaging } = require('firebase-admin/messaging');

let warnedMissingConfig = false;

function resolveServiceAccountPath() {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(process.cwd(), configuredPath);
  }

  return path.join(__dirname, '../../savira-firebase-adminsdk.json');
}

function initializeFirebaseAdmin() {
  if (getApps().length) return true;

  const serviceAccountPath = resolveServiceAccountPath();
  if (!fs.existsSync(serviceAccountPath)) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        `[Firebase Admin] Service account not found at ${serviceAccountPath}. Push notifications are disabled.`
      );
    }
    return false;
  }

  try {
    const serviceAccount = require(serviceAccountPath);
    initializeApp({
      credential: cert(serviceAccount),
    });
    return true;
  } catch (error) {
    console.warn('[Firebase Admin] Failed to initialize. Push notifications are disabled:', error.message);
    return false;
  }
}

function getMessaging() {
  return initializeFirebaseAdmin() ? getAdminMessaging() : null;
}

module.exports = { getMessaging };
