import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = { 
  apiKey: "AIzaSyAbsa0uvBYhkEYoLxuHwD4TQi5GDdAzQpg", 
  authDomain: "exchanger-pro.firebaseapp.com", 
  databaseURL: (window as any).FIREBASE_DATABASE_URL || "https://exchanger-pro-default-rtdb.firebaseio.com", 
  projectId: "exchanger-pro", 
  storageBucket: "exchanger-pro.firebasestorage.app", 
  messagingSenderId: "889959520630", 
  appId: "1:889959520630:web:f4cbf82f236b616e1f8257" 
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} catch (error) {
  // If already initialized (e.g., during Vite HMR), fall back to getAuth()
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getDatabase(app);
export const storage = getStorage(app);
let functionsInstance: any;
export const getFirebaseFunctions = () => {
  if (!functionsInstance) {
    try {
      functionsInstance = getFunctions(app);
    } catch (error) {
      console.error("Firebase Functions initialization failed:", error);
      throw error;
    }
  }
  return functionsInstance;
};


// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).firebaseDb = db;
  (window as any).firebaseAuth = auth;
}
