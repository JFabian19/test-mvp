import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User, Role } from '@/lib/types';
import { useRouter } from 'next/navigation';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch user role from Firestore 'users' collection
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User;
                        setUser(userData);
                        // No user document found? Then this user is not properly onboarded.
                        // Do NOT default to waiter.
                        console.warn("User document not found in Firestore for uid:", firebaseUser.uid);
                        setUser(null);
                        // Optional: trigger signOut if you want to force them out, 
                        // but maybe they are in the middle of registration.
                        // For now, null user means the UI won't show logged-in state or will redirect to login.
                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
                setLoading(false);
            });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await firebaseSignOut(auth);
        router.push('/login');
    };

    return { user, loading, logout };
}
