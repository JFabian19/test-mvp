'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Table, Product } from '@/lib/types';
import { TableGrid } from '@/components/waiter/TableGrid';
import { MenuModal } from '@/components/waiter/MenuModal';
import { CartDrawer } from '@/components/waiter/CartDrawer';
import { LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Mock Data for fallback
const MOCK_PRODUCTS: Product[] = [
    { id: '1', restaurantId: '1', name: 'Pollo a la Brasa (1/4)', price: 18.00, category: 'Fondos', active: true, description: 'Con papas y ensalada' },
    { id: '2', restaurantId: '1', name: 'Pollo a la Brasa (1/2)', price: 34.00, category: 'Fondos', active: true },
    { id: '3', restaurantId: '1', name: 'Mostrito', price: 22.00, category: 'Fondos', active: true, description: 'Chaufa + Pollo' },
    { id: '4', restaurantId: '1', name: 'Inca Kola 1L', price: 12.00, category: 'Bebidas', active: true },
    { id: '5', restaurantId: '1', name: 'Tequeños', price: 15.00, category: 'Entradas', active: true },
    { id: '6', restaurantId: '1', name: 'Aeropuerto', price: 24.00, category: 'Fondos', active: true },
];

const MOCK_TABLES: Table[] = Array.from({ length: 10 }, (_, i) => ({
    id: `t-${i + 1}`,
    restaurantId: '1',
    number: `${i + 1}`,
    status: 'free'
}));

export default function WaiterPage() {
    const { user, logout } = useAuth();
    const { toggleCart } = useStore();

    const [tables, setTables] = useState<Table[]>(MOCK_TABLES);
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Firestore listeners
    useEffect(() => {
        // Listen to Tables
        // Note: In real app, filter by user.restaurantId
        if (!user?.restaurantId) return;

        const qTables = query(collection(db, 'tables')); // Add filter where('restaurantId', '==', user.restaurantId)
        const unsubTables = onSnapshot(qTables, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
            if (fetched.length > 0) {
                setTables(fetched.sort((a, b) => Number(a.number) - Number(b.number)));
            }
        });

        // Fetch Products (Static for now, but could be real-time)
        const fetchProducts = async () => {
            const qProd = query(collection(db, 'products'), where('active', '==', true));
            const snap = await getDocs(qProd);
            const fetchedProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            if (fetchedProds.length > 0) setProducts(fetchedProds);
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
