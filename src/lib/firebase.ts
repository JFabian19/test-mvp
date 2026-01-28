import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
// You can get these from the Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
    apiKey: "AIzaSyDc1lgNrgt1kEzXVYsTK2-MWeVNttdZcmY",
    authDomain: "restofast-9a18c.firebaseapp.com",
    projectId: "restofast-9a18c",
    storageBucket: "restofast-9a18c.firebasestorage.app",
    messagingSenderId: "522727591684",
    appId: "1:522727591684:web:920ce8dc63ce8def2a8a51"
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

export { auth, db };
