import { initializeApp, getApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from './firebase';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { User, Role } from './types';

export const createStaffUser = async (
    restaurantId: string,
    email: string,
    password: string,
    displayName: string,
    role: Role
) => {
    const SECONDARY_APP_NAME = 'SecondaryApp';
    let secondaryApp: FirebaseApp;

    try {
        const apps = getApps();
        const existingApp = apps.find(a => a.name === SECONDARY_APP_NAME);

        if (existingApp) {
            secondaryApp = existingApp;
        } else {
            secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
        }

        const secondaryAuth = getAuth(secondaryApp);

        // This creates the user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;

        // Write to Firestore (we can use the secondary app's firestore to write as the new user, 
        // OR we can use the admin's context if rules allow admin to write to /users. 
        // Safest is to use the new user's auth context immediately)
        const secondaryDb = getFirestore(secondaryApp);

        const userData: User = {
            uid: newUser.uid,
            email: newUser.email,
            displayName: displayName,
            role: role,
            restaurantId: restaurantId,
            visiblePassword: password // Store password for admin reference
        };

        // Force strict merge true to avoid overwriting if somehow exists (unlikely with new uid)
        await setDoc(doc(secondaryDb, 'users', newUser.uid), userData);

        // Sign out to clean up this session
        await signOut(secondaryAuth);

        return newUser.uid;

    } catch (error) {
        console.error("Error creating staff user:", error);
        throw error;
    }
};
