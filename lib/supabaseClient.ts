

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirebaseConfig } from './config';

// Get validated Firebase config
const firebaseConfig = getFirebaseConfig();

// Initialize Firebase safely, preventing re-initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Get a reference to the database service
const db = getFirestore(app);

// Get a reference to the auth service
const auth = getAuth(app);

// Get a reference to the storage service
const storage = getStorage(app);

export { db, auth, storage };