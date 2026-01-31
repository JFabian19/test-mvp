'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { TableGrid } from '@/components/waiter/TableGrid';
import { PaymentModal } from '@/components/admin/PaymentModal';
import { StaffManager } from '@/components/admin/StaffManager';
import { MenuManager } from '@/components/admin/MenuManager';
import { TableSetup } from '@/components/admin/TableSetup';
import { SalesReports } from '@/components/admin/SalesReports';
import { RestaurantSettings } from '@/components/admin/RestaurantSettings';
import { LogOut, LayoutDashboard, Users, Utensils, BarChart3, Grid, Settings } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, Order, Product } from '@/lib/types';
import { toast } from 'sonner';
import { MenuModal } from '@/components/waiter/MenuModal';
import { useStore } from '@/store/useStore';

export default function AdminPage() {
    const { user, logout } = useAuth();
    const { restaurant } = useRestaurant();
    const [tables, setTables] = useState<Table[]>([]);
    const [activeTab, setActiveTab] = useState<'tables' | 'staff' | 'menu' | 'reports' | 'settings'>('tables');

    // Table/Payment State
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const { clearCart } = useStore();

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

    // Fetch Products (for MenuModal)
    useEffect(() => {
        if (!user?.restaurantId) return;
        const q = query(collection(db, 'products'), where('restaurantId', '==', user.restaurantId), where('active', '==', true));
        const unsub = onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        });
        return () => unsub();
    }, [user?.restaurantId]);

    // Real-time Order Listener
    useEffect(() => {
        if (!selectedTable?.currentOrderId) {
            setCurrentOrder(null);
            // If table selected but no order, open menu for new order
            if (selectedTable) setIsMenuOpen(true);
            return;
        }

        const unsub = onSnapshot(doc(db, 'orders', selectedTable.currentOrderId), (docSnap) => {
            if (docSnap.exists()) {
                setCurrentOrder({ id: docSnap.id, ...docSnap.data() } as Order);
                // Ensure menu is open if we selected a table with an active order
                setIsMenuOpen(true);
            } else {
                setCurrentOrder(null);
            }
        }, (error) => {
            console.error("Error listening to order:", error);
        });

        return () => unsub();
    }, [selectedTable?.currentOrderId]); // Re-run when table's order ID changes

    const handleTableSelect = (table: Table) => {
        setSelectedTable(table);
        clearCart();
        // Listener mechanism above handles fetching the order and opening the modal
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
            toast.success('Mesas actualizadas exitosamente');
        } catch (error) {
            console.error("Error updating tables:", error);
            toast.error("Error al actualizar las mesas");
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
                    <TabButton
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                        icon={<Settings size={18} />}
                        label="Ajustes"
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <SalesReports />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <RestaurantSettings />
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

            {/* Admin-Waiter Menu Modal */}
            <MenuModal
                isOpen={isMenuOpen}
                onClose={() => { setIsMenuOpen(false); setSelectedTable(null); setCurrentOrder(null); }}
                products={products}
                currentTableId={selectedTable?.id || null}
                activeOrder={currentOrder}
            />
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
