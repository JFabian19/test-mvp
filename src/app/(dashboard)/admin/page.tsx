'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { TableGrid } from '@/components/waiter/TableGrid';
import { PaymentModal } from '@/components/admin/PaymentModal';
import { StaffManager } from '@/components/admin/StaffManager';
import { MenuManager } from '@/components/admin/MenuManager';
import { TableSetup } from '@/components/admin/TableSetup';
import { LogOut, LayoutDashboard, Users, Utensils, BarChart3, Grid } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, Order } from '@/lib/types';

export default function AdminPage() {
    const { user, logout } = useAuth();
    const { restaurant } = useRestaurant();
    const [tables, setTables] = useState<Table[]>([]);
    const [activeTab, setActiveTab] = useState<'tables' | 'staff' | 'menu' | 'reports'>('tables');

    // Table/Payment State
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    // Table Configuration State
    const [isEditingTables, setIsEditingTables] = useState(false);

    // Fetch Tables
    useEffect(() => {
        if (!user?.restaurantId) return;

        const q = query(
            collection(db, 'tables'),
            where('restaurantId', '==', user.restaurantId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
            setTables(fetched.sort((a, b) => Number(a.number) - Number(b.number)));
        });
        return () => unsub();
    }, [user?.restaurantId]);

    const handleTableSelect = async (table: Table) => {
        setSelectedTable(table);
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
            // Logic to Edit Table Settings / QR Code could go here
            // For now, no action
        }
    };

    const handleUpdateTableCount = async (count: number) => {
        if (!user?.restaurantId) return;

        try {
            const batch = writeBatch(db);
            const currentCount = tables.length;

            // 1. Create new tables if needed
            if (count > currentCount) {
                const existingNumbers = new Set(tables.map(t => parseInt(t.number)));

                for (let i = 1; i <= count; i++) {
                    if (!existingNumbers.has(i)) {
                        const newTableRef = doc(collection(db, 'tables'));
                        batch.set(newTableRef, {
                            restaurantId: user.restaurantId,
                            number: i.toString(),
                            status: 'free',
                            seats: 4 // Default
                        });
                    }
                }
            }

            // 2. Remove tables if count < current
            if (count < currentCount) {
                const tablesToDelete = tables
                    .filter(t => parseInt(t.number) > count);

                tablesToDelete.forEach(t => {
                    batch.delete(doc(db, 'tables', t.id));
                });
            }

            await batch.commit();
            setIsEditingTables(false);
        } catch (error) {
            console.error("Error updating tables:", error);
            alert("Error al actualizar las mesas. Revisa la consola.");
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 shadow-md sticky top-0 z-20">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <LayoutDashboard size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">{restaurant?.name || 'Cargando...'}</h1>
                            <p className="text-xs text-slate-400">Panel de Control</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-300 hidden md:block">Hola, {user.displayName}</span>
                        <button onClick={logout} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content with Tabs */}
            <main className="flex-1 container mx-auto p-4 md:p-6 flex flex-col gap-6">
                {/* Tabs Navigation */}
                <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-800">
                    <TabButton
                        active={activeTab === 'tables'}
                        onClick={() => setActiveTab('tables')}
                        icon={<Grid size={18} />}
                        label="Mesas"
                    />
                    <TabButton
                        active={activeTab === 'staff'}
                        onClick={() => setActiveTab('staff')}
                        icon={<Users size={18} />}
                        label="Personal"
                    />
                    <TabButton
                        active={activeTab === 'menu'}
                        onClick={() => setActiveTab('menu')}
                        icon={<Utensils size={18} />}
                        label="Menú / Carta"
                    />
                    <TabButton
                        active={activeTab === 'reports'}
                        onClick={() => setActiveTab('reports')}
                        icon={<BarChart3 size={18} />}
                        label="Reportes"
                    />
                </div>

                {/* Tab Views */}
                <div className="flex-1">
                    {activeTab === 'tables' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Estado del Salón</h2>
                                <button
                                    onClick={() => setIsEditingTables(true)}
                                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                                >
                                    {tables.length > 0 ? 'Configurar Mesas' : ''}
                                </button>
                            </div>

                            {isEditingTables ? (
                                <TableSetup
                                    currentCount={tables.length}
                                    onSave={handleUpdateTableCount}
                                    onCancel={() => setIsEditingTables(false)}
                                />
                            ) : tables.length === 0 ? (
                                <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                                    <p className="mb-4">No tienes mesas configuradas.</p>
                                    <button
                                        onClick={() => setIsEditingTables(true)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
                                    >
                                        Crear Mesas
                                    </button>
                                </div>
                            ) : (
                                <TableGrid tables={tables} onSelectTable={handleTableSelect} />
                            )}
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <StaffManager />
                        </div>
                    )}

                    {activeTab === 'menu' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <MenuManager />
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <BarChart3 size={48} className="mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-slate-300 mb-2">Reportes y Métricas</h3>
                            <p>Visualiza tus ventas diarias y platos más vendidos.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Global Modals */}
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

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-medium transition-all relative
                ${active ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}
            `}
        >
            {icon}
            <span>{label}</span>
            {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
        </button>
    );
}
