'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/lib/types';
import { OrderCard } from '@/components/kitchen/OrderCard';
import { LogOut, ChefHat } from 'lucide-react';

export default function KitchenPage() {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (!user?.restaurantId) return;

        // Listen for pending/cooking orders
        // Filter by restaurantId AND status = pending/cooking
        // Note: Composite queries (equality on restId + IN on status) usually work without custom index,
        // but adding 'orderBy' often breaks it without an index. We sort client-side to be safe.
        const q = query(
            collection(db, 'orders'),
            where('restaurantId', '==', user.restaurantId),
            where('status', 'in', ['pending', 'cooking'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

            // Client-side sort: Oldest first
            fetched.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            setOrders(fetched);
        }, (error) => {
            console.error("Error fetching kitchen orders:", error);
        });

        return () => unsubscribe();
    }, [user?.restaurantId]);

    const handleMarkReady = async (orderId: string) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: 'ready',
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-10">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2 text-orange-500">
                    <ChefHat size={28} />
                    <h1 className="text-xl font-bold">Kitchen Display System (KDS)</h1>
                </div>
                <button onClick={logout} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition">
                    <LogOut size={20} />
                </button>
            </header>

            <main className="pt-24 px-4 container mx-auto">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                        <ChefHat size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">No hay pedidos pendientes</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {orders.map(order => (
                            <OrderCard key={order.id} order={order} onMarkReady={handleMarkReady} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
