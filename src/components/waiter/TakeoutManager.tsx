import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { CollectionReference, collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, OrderItem, Product, Table } from '@/lib/types'; // Updated types
import { ShoppingBag, Plus, Clock, ChefHat, CheckCircle2, Trash2, User, DollarSign, PackageCheck } from 'lucide-react';
import { MenuModal } from '@/components/waiter/MenuModal';
import { PaymentOptionsModal } from '@/components/waiter/PaymentOptionsModal';
import { clsx } from 'clsx';
import { toast } from 'sonner';

export function TakeoutManager() {
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const [orders, setOrders] = useState<Order[]>([]);

    // UI States
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null); // For editing/paying existing
    const [pendingItems, setPendingItems] = useState<OrderItem[]>([]); // Items being built for new order

    // Payment State
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [orderToPay, setOrderToPay] = useState<Order | null>(null);

    // Confirmation Modal State
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void> | void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: () => { },
        type: 'info'
    });

    // Products for Menu
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        if (!user?.restaurantId) return;

        // Fetch active takeout orders
        const q = query(
            collection(db, 'orders'),
            where('restaurantId', '==', user.restaurantId),
            where('type', '==', 'takeout'),
            where('status', 'in', ['pending', 'cooking', 'ready', 'delivered'])
            // Fetch only active orders. This avoids the "multiple !=" error.
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
            // Sort by recent
            fetched.sort((a, b) => b.createdAt - a.createdAt);
            setOrders(fetched);
        });

        // Fetch products as well (could be moved to parent or hook)
        const qProd = query(collection(db, 'products'), where('restaurantId', '==', user.restaurantId), where('active', '==', true));
        const unsubProd = onSnapshot(qProd, (snap) => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        });

        return () => { unsub(); unsubProd(); };
    }, [user?.restaurantId]);

    const handleStartNewOrder = () => {
        setNewCustomerName('');
        setIsNameModalOpen(true);
    };

    const handleNameSubmit = () => {
        if (!newCustomerName.trim()) {
            toast.error("Ingresa un nombre de referencia");
            return;
        }
        setIsNameModalOpen(false);
        // Clean state for new order
        setPendingItems([]);
        setCurrentOrder({
            id: 'temp',
            customerName: newCustomerName,
            items: [],
            total: 0,
            status: 'pending',
            tableNumber: 'LLEVAR',
            tableId: 'takeout',
            restaurantId: restaurant?.id || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            type: 'takeout'
        } as Order);
        setIsMenuOpen(true);
    };

    // Called when user finishes selecting items in MenuModal
    const handleConfirmOrder = async (items: OrderItem[]) => {
        if (!restaurant || !user) return;

        const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        // Config check: Payment Before or After?
        const payBeforeKey = restaurant.takeoutPaymentTiming === 'before';

        if (payBeforeKey) {
            // Need to pay first. 
            // We create a temporary order object or save it as 'pending-payment' somewhere? 
            // Simplest: Save as valid order but maybe with status that doesn't show in kitchen yet? 
            // Or just pass data to PaymentModal and create everything at the end.

            // Let's create the order doc FIRST (so we have ID for receipt) but status 'pending' (or custom 'awaiting_payment')
            // Users want "Order in Kitchen" only AFTER payment.

            // Current approach used in PaymentModal: It updates existing order.
            // So we must create the order first. Let's create it with status 'pending'.
            // Kitchen should NOT show 'pending' if it strictly filters for 'pending'. 
            // Wait, usually 'pending' = In Kitchen. 
            // Let's use a flag or just handle it in PaymentModal.

            // For now: We'll create the order, then immediately prompt payment.
            // Only if payment is successful do we verify it's "confirmed".
            // Actually, if "pay before", we shouldn't even list it in kitchen.

            try {
                const docRef = await addDoc(collection(db, 'orders'), {
                    restaurantId: restaurant.id,
                    type: 'takeout',
                    customerName: currentOrder?.customerName,
                    tableNumber: 'LLEVAR',
                    items,
                    total,
                    status: 'pending', // 'pending' usually means "Sent to kitchen". 
                    // If we want to hide from kitchen until paid, we need kitchen to filter by 'paid' or status. 
                    // Let's assume kitchen sees everything "pending". 
                    // If user wants STRICT payment before kitchen, we'd need a 'draft' status.
                    // For MVP simplicity: Create order -> Prompt Payment. 
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });

                const newOrderFn = { ...currentOrder!, id: docRef.id, items, total };
                setIsMenuOpen(false);

                // Open Payment Immediately
                setOrderToPay(newOrderFn as Order);
                setIsPaymentOpen(true);

            } catch (e) {
                console.error(e);
                toast.error("Error al crear orden");
            }

        } else {
            // Pay After (Default)
            // Just create order and send to kitchen
            try {
                await addDoc(collection(db, 'orders'), {
                    restaurantId: restaurant.id,
                    type: 'takeout',
                    customerName: currentOrder?.customerName,
                    tableNumber: 'LLEVAR',
                    items,
                    total,
                    status: 'pending',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                toast.success("Pedido para llevar enviado a cocina");
                setIsMenuOpen(false);
                setCurrentOrder(null);
            } catch (e) {
                console.error(e);
                toast.error("Error al crear orden");
            }
        }
    };

    const handlePayClick = (order: Order) => {
        setOrderToPay(order);
        setIsPaymentOpen(true);
    };

    const handleCancelOrder = (orderId: string) => {
        setConfirmation({
            isOpen: true,
            title: 'Cancelar Pedido',
            message: '¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.',
            type: 'danger',
            action: async () => {
                try {
                    await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
                    toast.success("Pedido cancelado");
                } catch (e) {
                    toast.error("Error al cancelar");
                }
                setConfirmation(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDispatchOrder = (orderId: string) => {
        setConfirmation({
            isOpen: true,
            title: 'Confirmar Entrega',
            message: '¿Confirmar que el cliente ha recibido su pedido y cerrar la orden?',
            type: 'info',
            action: async () => {
                try {
                    await updateDoc(doc(db, 'orders', orderId), {
                        status: 'completed',
                        updatedAt: Date.now()
                    });
                    toast.success("Pedido entregado y cerrado");
                } catch (e) {
                    console.error(e);
                    toast.error("Error al finalizar pedido");
                }
                setConfirmation(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShoppingBag className="text-orange-500" />
                        Pedidos Para Llevar
                    </h2>
                    <p className="text-sm text-slate-400">Gestiona pedidos de barra y delivery</p>
                </div>
                <button
                    onClick={handleStartNewOrder}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-orange-500/20 transition-all"
                >
                    <Plus size={20} /> Nuevo Pedido
                </button>
            </div>

            {/* Orders List / Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all flex flex-col relative group">
                        {/* Header */}
                        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-white text-lg truncate w-32 md:w-40" title={order.customerName}>
                                    {order.customerName || 'Cliente'}
                                </h3>
                                <p className="text-xs text-orange-400 font-medium flex items-center gap-1">
                                    <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={clsx(
                                    "px-2 py-1 rounded text-[10px] font-bold uppercase border",
                                    order.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                        order.status === 'ready' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                            "bg-slate-800 text-slate-400 border-slate-700"
                                )}>
                                    {order.status === 'pending' ? 'En Cocina' : order.status === 'ready' ? 'Listo' : order.status}
                                </span>
                                {order.receiptCode && <span className="text-[10px] text-emerald-500 mt-1">Pagado</span>}
                            </div>
                        </div>

                        {/* Items */}
                        <div className="p-4 flex-1 space-y-2">
                            {order.items.slice(0, 4).map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm text-slate-300">
                                    <span className="truncate flex-1">{item.quantity}x {item.name}</span>
                                </div>
                            ))}
                            {order.items.length > 4 && (
                                <p className="text-xs text-slate-500 italic">+ {order.items.length - 4} más...</p>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 bg-slate-950/30 border-t border-slate-800 mt-auto">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-400 text-xs">Total</span>
                                <span className="text-xl font-bold text-emerald-400">S/ {order.total.toFixed(2)}</span>
                            </div>

                            <div className="flex gap-2">
                                {!order.receiptCode ? (
                                    <button
                                        onClick={() => handlePayClick(order)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <DollarSign size={16} />
                                        Cobrar
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleDispatchOrder(order.id)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors animate-in fade-in"
                                    >
                                        <PackageCheck size={16} />
                                        Despachar
                                    </button>
                                )}
                                <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 transition-colors"
                                    title="Cancelar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {orders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                        <ShoppingBag size={48} className="mb-4 opacity-50" />
                        <p>No hay pedidos activos para llevar.</p>
                        <button onClick={handleStartNewOrder} className="mt-4 text-orange-500 hover:underline">Crear el primero</button>
                    </div>
                )}
            </div>

            {/* Name Input Modal */}
            {isNameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-sm rounded-xl border border-slate-700 p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Nombre del Cliente / Referencia</h3>
                        <input
                            autoFocus
                            type="text"
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                            placeholder="Ej. Juan, Rappi Pedido #123..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white mb-6 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsNameModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-bold">Cancelar</button>
                            <button onClick={handleNameSubmit} className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">Continuar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Modal reuse */}
            {/* Menu Modal */}
            <MenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                products={products}
                currentTableId={null}
                activeOrder={currentOrder}
                onTakeoutSubmit={handleConfirmOrder}
            />

            {orderToPay && restaurant && user && (
                <PaymentOptionsModal
                    isOpen={isPaymentOpen}
                    onClose={() => { setIsPaymentOpen(false); setOrderToPay(null); }}
                    currentOrder={orderToPay}
                    total={orderToPay.total}
                />
            )}
            {/* Confirmation Modal */}
            {confirmation.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-sm rounded-xl border border-slate-700 p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">{confirmation.title}</h3>
                        <p className="text-slate-400 mb-6">{confirmation.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmation.action}
                                className={clsx(
                                    "flex-1 py-3 text-white rounded-lg font-bold shadow-lg transition-colors",
                                    confirmation.type === 'danger'
                                        ? "bg-red-600 hover:bg-red-500 hover:shadow-red-900/20"
                                        : "bg-blue-600 hover:bg-blue-500 hover:shadow-blue-900/20"
                                )}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
