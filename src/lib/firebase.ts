import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
// You can get these from the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error. Make sure you have set up your environment variables.", error);
    // Note: This will likely crash if credentials are strictly required immediately, 
    // but allows the app to build without them.
}

export { auth, db, firebaseConfig };
