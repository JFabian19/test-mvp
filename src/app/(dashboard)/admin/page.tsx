'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Table, Product, Order } from '@/lib/types';
import { TableGrid } from '@/components/waiter/TableGrid';
import { PaymentModal } from '@/components/admin/PaymentModal';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminPage() {
    const { user, logout } = useAuth();
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    useEffect(() => {
        if (!user?.restaurantId) return;
        const q = query(collection(db, 'tables'));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
            setTables(fetched.sort((a, b) => Number(a.number) - Number(b.number)));
        });
        return () => unsub();
    }, [user]);

    const handleTableSelect = async (table: Table) => {
        setSelectedTable(table);
        // If occupied, fetch current order
        if (table.status === 'occupied' && table.currentOrderId) {
            try {
                const orderSnap = await getDoc(doc(db, 'orders', table.currentOrderId));
                if (orderSnap.exists()) {
                    setCurrentOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
                    setIsPaymentOpen(true);
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            // Maybe open settings or history for free table? 
            // For MVP, nothing or just alert
            alert(`Mesa ${table.number} está libre.`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <header className="fixed top-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2 text-blue-500">
                    <LayoutDashboard size={28} />
                    <h1 className="text-xl font-bold">Admin Dashboard</h1>
                </div>
                <button onClick={logout} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition">
                    <LogOut size={20} />
                </button>
            </header>

            <main className="pt-24 px-4 container mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-white pl-2 border-l-4 border-blue-500">Estado de Mesas</h2>
                <TableGrid tables={tables} onSelectTable={handleTableSelect} />
            </main>

            {selectedTable && (
                <PaymentModal
                    isOpen={isPaymentOpen}
                    onClose={() => { setIsPaymentOpen(false); setSelectedTable(null); setCurrentOrder(null); }}
                    table={selectedTable}
                    order={currentOrder}
                />
            )}
        </div>
    );
}
