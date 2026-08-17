import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = { 
  apiKey: "AIzaSyAbsa0uvBYhkEYoLxuHwD4TQi5GDdAzQpg", 
  authDomain: "exchanger-pro.firebaseapp.com", 
  databaseURL: "https://exchanger-pro-default-rtdb.firebaseio.com", 
  projectId: "exchanger-pro", 
  storageBucket: "exchanger-pro.firebasestorage.app", 
  messagingSenderId: "889959520630", 
  appId: "1:889959520630:web:f4cbf82f236b616e1f8257" 
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
