import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database"; // <-- ADDED: Realtime Database
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4SEScjZ0mPkTghVk0a1cV4rIics3b77U",
  authDomain: "gasolve-c9f1e.firebaseapp.com",
  databaseURL: "https://gasolve-c9f1e-default-rtdb.firebaseio.com",
  projectId: "gasolve-c9f1e",
  storageBucket: "gasolve-c9f1e.firebasestorage.app",
  messagingSenderId: "340385020318",
  appId: "1:340385020318:web:0f6c7cbdc33eb91bc47e8f",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app); // For user accounts (Firestore)
const rtdb = getDatabase(app); // For live gas sensors (Realtime Database)

// Export all three!
export { auth, db, rtdb };
