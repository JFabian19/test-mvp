'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Table, Product } from '@/lib/types';
import { TableGrid } from '@/components/waiter/TableGrid';
import { MenuModal } from '@/components/waiter/MenuModal';
import { LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, ItemStatus, OrderItem } from '@/lib/types';
import { Bell, CheckCircle } from 'lucide-react';

// Simple Toast Component
function Toast({ message, onClose }: { message: string, onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5 z-50">
            <Bell className="animate-bounce" />
            <div>
                <p className="font-bold">¡Plato Listo!</p>
                <p className="text-sm">{message}</p>
            </div>
            <button onClick={onClose} className="ml-4 hover:bg-emerald-700 p-1 rounded">✕</button>
        </div>
    );
}

export default function WaiterPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    const [tables, setTables] = useState<Table[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // RBAC Guard
    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'owner' || user.role === 'admin') {
                router.push('/admin');
            } else if (user.role === 'kitchen') {
                router.push('/kitchen');
            }
        } else if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [notifications, setNotifications] = useState<string[]>([]);

    const addNotification = (msg: string) => {
        setNotifications(prev => [...prev, msg]);
        // Sound effect could go here
    };

    // RBAC Guard
    // ... existing RBAC ...

    // Firestore listeners
    useEffect(() => {
        if (!user?.restaurantId) return;

        // 1. Listen to Tables
        const qTables = query(collection(db, 'tables'), where('restaurantId', '==', user.restaurantId));
        const unsubTables = onSnapshot(qTables, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
            setTables(fetched.sort((a, b) => Number(a.number) - Number(b.number)));
        });

        // 2. Listen to Active Orders (for progress & notifications)
        // Fetch ALL non-archived orders to avoid index issues. Client-side filtering is safer for MVP.
        const qOrders = query(
            collection(db, 'orders'),
            where('restaurantId', '==', user.restaurantId)
        );

        let previousOrdersMap = new Map<string, Order>();

        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

            // Filter out completed/paid orders for the UI
            // We include 'delivered' so they can be paid.
            const visibleOrders = allOrders.filter(o => o.status !== 'completed');

            // Check changes for notifications
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified' || change.type === 'added') {
                    const newOrder = change.doc.data() as Order;
                    // Ignore completed orders for notifications
                    if (newOrder.status === 'completed') return;

                    const oldOrder = previousOrdersMap.get(newOrder.id);

                    if (oldOrder) {
                        newOrder.items.forEach(newItem => {
                            if (newItem.status === 'ready') {
                                const oldItem = oldOrder.items.find(i => i.id === newItem.id);
                                // Notify if it wasn't ready before (either didn't exist or wasn't ready)
                                if (!oldItem || oldItem.status !== 'ready') {
                                    addNotification(`Mesa ${newOrder.tableNumber}: ${newItem.name} está listo.`);
                                }
                            }
                        });
                    } else if (change.type === 'added') {
                        // Initial load or new order, check if any ready? Usually starts pending.
                        // Can skip notification for initial load if we want.
                        // For now, only notify if 'ready' and purely new (rare for kitchen to add ready item).
                    }

                    // Update map
                    previousOrdersMap.set(newOrder.id, newOrder);
                }
            });

            // Update state
            setActiveOrders(visibleOrders);
            // Sync map for initial load or removals
            if (snapshot.docChanges().length === 0 || snapshot.size !== previousOrdersMap.size) {
                visibleOrders.forEach(o => previousOrdersMap.set(o.id, o));
            }
        });

        // 3. Fetch Products
        const fetchProducts = async () => {
            // ... existing fetch ...
            const qProd = query(collection(db, 'products'), where('active', '==', true), where('restaurantId', '==', user.restaurantId));
            const snap = await getDocs(qProd);
            setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        };
        fetchProducts();

        return () => {
            unsubTables();
            unsubOrders();
        };
    }, [user?.restaurantId]);

    const handleTableSelect = (table: Table) => {
        setSelectedTable(table);
        setIsMenuOpen(true);
    };

    // Helper to get Table Status/Progress
    const getTableStatus = (tableId: string) => {
        const order = activeOrders.find(o => o.tableId === tableId && o.status !== 'completed'); // Show delivered too
        if (!order) return null;

        const totalItems = order.items.length;
        if (totalItems === 0) return { progress: 0, order };

        const completedItems = order.items.filter(i => i.status === 'ready' || i.status === 'delivered').length;
        const progress = Math.round((completedItems / totalItems) * 100);

        return { progress, order };
    };

    const handleItemDelivered = async (orderId: string, itemId: string) => {
        // Find order
        const order = activeOrders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = order.items.map(i => {
            if (i.id === itemId) return { ...i, status: 'delivered' as ItemStatus };
            return i;
        });

        const allDelivered = updatedItems.every(i => i.status === 'delivered');

        await updateDoc(doc(db, 'orders', orderId), {
            items: updatedItems,
            status: allDelivered ? 'delivered' : order.status
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
                <h1 className="text-xl font-bold text-orange-500">Mesero View</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
                    <button onClick={logout} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="pt-24 px-4 container mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-white pl-2 border-l-4 border-orange-500">Salón Principal</h2>
                <TableGrid
                    tables={tables}
                    onSelectTable={handleTableSelect}
                    getTableStatus={getTableStatus}
                />
            </main>

            {/* Notifications */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
                {notifications.map((msg, idx) => (
                    <Toast
                        key={idx}
                        message={msg}
                        onClose={() => setNotifications(prev => prev.filter((_, i) => i !== idx))}
                    />
                ))}
            </div>

            {/* Modals */}
            <MenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                products={products}
                currentTableId={selectedTable?.id || null}
                activeOrder={activeOrders.find(o => o.tableId === selectedTable?.id && o.status !== 'completed') || null}
            />
        </div>
    );
}
