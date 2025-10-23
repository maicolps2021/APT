
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { FIREBASE_CONFIG } from './config';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);

// Get a reference to the database service
const db = getFirestore(app);

// Get a reference to the auth service
const auth = getAuth(app);

// Get a reference to the storage service
const storage = getStorage(app);

export { db, auth, storage };
