'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, ItemStatus } from '@/lib/types';
import { OrderCard } from '@/components/kitchen/OrderCard';
import { LogOut, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

export default function KitchenPage() {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (!user?.restaurantId) return;

        // Listen for pending/cooking orders
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
            toast.error("Error cargando pedidos de cocina");
        });

        return () => unsubscribe();
    }, [user?.restaurantId]);

    const handleUpdateItemStatus = async (orderId: string, itemId: string, newStatus: ItemStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Ideally we map by ID. Fallback logic removed for clarity as items should have IDs now.
        const updatedItems = order.items.map(item => {
            if (item.id === itemId) {
                return { ...item, status: newStatus };
            }
            return item;
        });

        // Determine if Order Status should change
        // Logic: if all items 'ready' or 'delivered' -> Order 'ready'
        // If all 'delivered' -> Order 'delivered'
        // Else -> 'cooking' if any is cooking/ready/delivered, or 'pending' if all pending.
        // For KDS, we mainly care if it's 'ready' to notify waiter.

        let newOrderStatus = order.status;
        const allItemsReadyOrDelivered = updatedItems.every(i => i.status === 'ready' || i.status === 'delivered');

        if (allItemsReadyOrDelivered && order.status !== 'ready' && order.status !== 'delivered') {
            newOrderStatus = 'ready';
        } else if (updatedItems.some(i => i.status === 'cooking') && order.status === 'pending') {
            newOrderStatus = 'cooking';
        }

        try {
            await updateDoc(doc(db, 'orders', orderId), {
                items: updatedItems,
                status: newOrderStatus,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar estado");
        }
    };

    const handleMarkAllReady = async (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(item => ({ ...item, status: 'ready' as const }));

        try {
            await updateDoc(doc(db, 'orders', orderId), {
                items: updatedItems,
                status: 'ready',
                updatedAt: Date.now()
            });
            toast.success("Pedido marcado como LISTO");
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar pedido");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-10">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2 text-orange-500">
                    <ChefHat size={28} />
                    <h1 className="text-xl font-bold">Pantalla de Cocina (KDS)</h1>
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
                            <OrderCard
                                key={order.id}
                                order={order}
                                onUpdateItemStatus={handleUpdateItemStatus}
                                onMarkAllReady={handleMarkAllReady} // Optional feature
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
