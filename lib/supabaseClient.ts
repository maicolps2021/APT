
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
// FIX: Import FIREBASE_CONFIG from the dedicated config file to resolve circular dependency.
import { FIREBASE_CONFIG } from './config';

// Initialize Firebase
if (!FIREBASE_CONFIG || Object.keys(FIREBASE_CONFIG).length === 0) {
    throw new Error("Firebase configuration is missing or invalid. Please check your VITE_FIREBASE_CONFIG environment variable.");
}
const app = initializeApp(FIREBASE_CONFIG);

// Get a reference to the database service
const db = getFirestore(app);

// Get a reference to the auth service
const auth = getAuth(app);

// Get a reference to the storage service
const storage = getStorage(app);

export { db, auth, storage };
