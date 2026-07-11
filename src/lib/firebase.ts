import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_khJ4stNvwTMyKgBFWobVl8oz0Dcq7_s",
  authDomain: "auth.taskwai.com",
  projectId: "taskwai-com",
  storageBucket: "taskwai-com.firebasestorage.app",
  messagingSenderId: "888780289762",
  appId: "1:888780289762:web:8253de79617e330b9cd0bb"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// Use the default Firestore database for the custom project
const db = getFirestore(app);

export { app, auth, googleProvider, db };
