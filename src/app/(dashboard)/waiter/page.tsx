'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Table, Product, Order } from '@/lib/types';
import { TableGrid } from '@/components/waiter/TableGrid';
import { MenuModal } from '@/components/waiter/MenuModal'; // Used globally for dine-in
import { TakeoutManager } from '@/components/waiter/TakeoutManager';
import { LogOut, Grid, ShoppingBag } from 'lucide-react';
import { collection, onSnapshot, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clsx } from 'clsx';

export default function WaiterPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'dine-in' | 'takeout'>('dine-in');

    const [tables, setTables] = useState<Table[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);

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

    // Firestore listeners (Tables & Orders for Dine-In)
    useEffect(() => {
        if (!user?.restaurantId) return;

        // 1. Listen to Tables
        const qTables = query(collection(db, 'tables'), where('restaurantId', '==', user.restaurantId));
        const unsubTables = onSnapshot(qTables, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
            setTables(fetched.sort((a, b) => Number(a.number) - Number(b.number)));
        });

        // 2. Listen to Active Orders (for progress & notifications)
        const qOrders = query(
            collection(db, 'orders'),
            where('restaurantId', '==', user.restaurantId),
            where('status', 'in', ['pending', 'cooking', 'ready', 'delivered'])
        );

        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            // Visible Dine-In Orders
            const visibleOrders = allOrders.filter(o => o.status !== 'completed');
            setActiveOrders(visibleOrders);
        });

        // 3. Fetch Products
        const fetchProducts = async () => {
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 flex flex-col">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-orange-500">Mesero Panel</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
                        <button onClick={logout} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 pt-20 px-4 container mx-auto">
                {/* Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800 backdrop-blur-sm flex">
                        <button
                            onClick={() => setActiveTab('dine-in')}
                            className={clsx(
                                "flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all",
                                activeTab === 'dine-in' ? "bg-orange-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Grid size={18} />
                            Salón
                        </button>
                        <button
                            onClick={() => setActiveTab('takeout')}
                            className={clsx(
                                "flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all",
                                activeTab === 'takeout' ? "bg-orange-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <ShoppingBag size={18} />
                            Para Llevar
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {activeTab === 'dine-in' ? (
                        <>
                            <h2 className="text-xl font-bold mb-4 text-white pl-2 border-l-4 border-orange-500">Mesas</h2>
                            <TableGrid
                                tables={tables}
                                onSelectTable={handleTableSelect}
                                getTableStatus={getTableStatus}
                            />
                        </>
                    ) : (
                        <TakeoutManager />
                    )}
                </div>
            </main>

            {/* Menu Modal (Only for Dine-In logic here, TakeoutManager has its own) */}
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
