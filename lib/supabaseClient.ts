import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { FIREBASE_CONFIG } from './config';

// Validate Firebase configuration
const requiredConfigKeys: (keyof typeof FIREBASE_CONFIG)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket'];
const missingKeys = requiredConfigKeys.filter(key => !FIREBASE_CONFIG[key]);

if (missingKeys.length > 0) {
  throw new Error(`Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. Please check your environment variables.`);
}

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Authenticate the user anonymously to satisfy security rules
// This allows the app to work for any user without a formal login process.
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous sign-in failed:", error);
});


export { db, storage, auth };
