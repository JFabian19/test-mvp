'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Restaurant } from '@/lib/types';

export function useRestaurant() {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.restaurantId) {
            setLoading(false);
            return;
        }

        const fetchRestaurant = async () => {
            try {
                const docRef = doc(db, 'restaurants', user.restaurantId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setRestaurant({ id: snap.id, ...snap.data() } as Restaurant);
                } else {
                    console.error("Restaurant not found for ID:", user.restaurantId);
                }
            } catch (error) {
                console.error("Error fetching restaurant:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRestaurant();
    }, [user?.restaurantId]);

    return { restaurant, loading };
}
