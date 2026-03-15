import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4SEScjZ0mPkTghVk0a1cV4rIics3b77U",
  authDomain: "gasolve-c9f1e.firebaseapp.com",
  databaseURL: "https://gasolve-c9f1e-default-rtdb.firebaseio.com",
  projectId: "gasolve-c9f1e",
  storageBucket: "gasolve-c9f1e.firebasestorage.app",
  messagingSenderId: "340385020318",
  appId: "1:340385020318:web:0f6c7cbdc33eb91bc47e8f",
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth with Persistence (Stay Logged In)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// 3. Initialize Realtime Database
const rtdb = getDatabase(app);

// 4. Initialize Firestore with Long Polling (Stable Connection)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, 
});

export { auth, db, rtdb };
