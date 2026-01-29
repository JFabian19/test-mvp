'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Table, Product } from '@/lib/types';
import { TableGrid } from '@/components/waiter/TableGrid';
import { MenuModal } from '@/components/waiter/MenuModal';
import { CartDrawer } from '@/components/waiter/CartDrawer';
import { LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function WaiterPage() {
    const { user, logout, loading } = useAuth();
    const { toggleCart } = useStore();
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

    // Firestore listeners
    useEffect(() => {
        if (!user?.restaurantId) return;

        // Listen to Tables
        const qTables = query(
            collection(db, 'tables'),
            where('restaurantId', '==', user.restaurantId)
        );
        const unsubTables = onSnapshot(qTables, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
            setTables(fetched.sort((a, b) => Number(a.number) - Number(b.number)));
        });

        // Fetch Products
        const fetchProducts = async () => {
            const qProd = query(
                collection(db, 'products'),
                where('active', '==', true),
                where('restaurantId', '==', user.restaurantId)
            );
            const snap = await getDocs(qProd);
            const fetchedProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProds);
        };
        fetchProducts();

        return () => unsubTables();
    }, [user?.restaurantId]);

    const handleTableSelect = (table: Table) => {
        setSelectedTable(table);
        // If table is free, open menu to start order
        if (table.status === 'free') {
            setIsMenuOpen(true);
        } else {
            // If occupied, maybe show current order? 
            // For MVP, enable adding more items to existing order?
            // Let's open menu too, assuming "Adding to order".
            setIsMenuOpen(true);
        }
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
                <TableGrid tables={tables} onSelectTable={handleTableSelect} />
            </main>

            {/* Modals */}
            <MenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                products={products}
                currentTableId={selectedTable?.id || null}
            />

            <CartDrawer currentTable={selectedTable} />
        </div>
    );
}
