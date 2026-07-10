import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYZCUmQfvFDLrJuA800k4A-35Vf7zUkso",
  authDomain: "predictive-terminus-8s7sz.firebaseapp.com",
  projectId: "predictive-terminus-8s7sz",
  storageBucket: "predictive-terminus-8s7sz.firebasestorage.app",
  messagingSenderId: "316278253450",
  appId: "1:316278253450:web:f10bec13d64f652f278a73"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// Explicitly specify the database ID for this applet
const db = getFirestore(app, "ai-studio-60ab5c0b-950b-4390-baf0-2038b8f1b076");

export { app, auth, googleProvider, db };
