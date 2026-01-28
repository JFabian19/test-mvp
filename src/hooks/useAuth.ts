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
                    } else {
                        // Fallback for new users or if doc doesn't exist yet (could auto-create or error)
                        // For MVP, we might treat them as 'waiter' by default or null
                        console.warn("User document not found in Firestore");
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            role: 'waiter', // Default fallback for MVP testing
                            restaurantId: 'demo-restaurant-1'
                        });
                    }
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
