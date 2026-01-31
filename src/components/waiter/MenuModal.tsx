'use client';

import { useState, useEffect } from 'react';
import { Product, Order, ItemStatus } from '@/lib/types';
import { X, Plus, Trash2, Send, CheckCircle, Clock, ChefHat, Bell, DollarSign, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '@/store/useStore';
import { updateDoc, doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PaymentOptionsModal } from './PaymentOptionsModal';
import { toast } from 'sonner';

interface MenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    currentTableId: string | null;
    activeOrder: Order | null;
}

const statusConfig: Record<ItemStatus, { color: string, icon: any, label: string }> = {
    pending: { color: 'text-slate-400', icon: Clock, label: 'En espera' },
    cooking: { color: 'text-orange-400', icon: ChefHat, label: 'Cocinando' },
    ready: { color: 'text-emerald-400', icon: Bell, label: 'Listo para servir' },
    delivered: { color: 'text-emerald-500', icon: CheckCircle, label: 'Entregado' }
};

export function MenuModal({ isOpen, onClose, products, currentTableId, activeOrder }: MenuModalProps) {
    const { cart, addToCart, removeFromCart, clearCart, updateCartItemNote } = useStore();
    const [activeCategory, setActiveCategory] = useState<string>('Entradas');
    const [sending, setSending] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    // Confirmation State
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null);

    // Categories
    const dynamicCategories = Array.from(new Set(products.map(p => p.category))).sort();
    const categoriesToShow = dynamicCategories.length > 0 ? dynamicCategories : ['Entradas', 'Fondos', 'Bebidas', 'Postres'];

    useEffect(() => {
        if (isOpen && categoriesToShow.length > 0) setActiveCategory(categoriesToShow[0]);
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredProducts = products.filter(p => p.category === activeCategory);

    // Calculations
    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const orderTotal = activeOrder ? activeOrder.items.reduce((acc, item) => acc + (item.price * item.quantity), 0) : 0;
    const finalTotal = cartTotal + orderTotal;

    // Handlers
    const handleSendOrder = async () => {
        if (!currentTableId || cart.length === 0) return;
        setSending(true);

        try {
            const newItems = cart.map(item => ({
                id: crypto.randomUUID(),
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                note: item.note,
                status: 'pending' as ItemStatus
            }));

            if (activeOrder) {
                // Append to existing
                const updatedItems = [...activeOrder.items, ...newItems];
                const newTotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

                await updateDoc(doc(db, 'orders', activeOrder.id), {
                    items: updatedItems,
                    total: newTotal,
                    updatedAt: Date.now(),
                    status: activeOrder.status === 'delivered' ? 'pending' : activeOrder.status
                });
            } else {
                // Create New
                const tableSnap = await getDoc(doc(db, 'tables', currentTableId));
                if (!tableSnap.exists()) throw new Error("Table not found");
                const tableData = tableSnap.data();

                const newOrderData = {
                    restaurantId: tableData.restaurantId,
                    tableId: currentTableId,
                    tableNumber: tableData.number,
                    items: newItems,
                    status: 'pending',
                    total: cartTotal,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                const ref = await addDoc(collection(db, 'orders'), newOrderData);
                await updateDoc(doc(db, 'tables', currentTableId), {
                    status: 'occupied',
                    currentOrderId: ref.id
                });
            }
            clearCart();
            toast.success('Pedido enviado a cocina');
        } catch (e) {
            console.error(e);
            toast.error("Error al enviar pedido");
        } finally {
            setSending(false);
        }
    };

    const handleMarkDelivered = async (itemId: string) => {
        if (!activeOrder) return;
        const updatedItems = activeOrder.items.map(i =>
            i.id === itemId ? { ...i, status: 'delivered' as ItemStatus } : i
        );
        const allDelivered = updatedItems.every(i => i.status === 'delivered');

        await updateDoc(doc(db, 'orders', activeOrder.id), {
            items: updatedItems,
            status: allDelivered ? 'delivered' : activeOrder.status,
            updatedAt: Date.now()
        });
        toast.success('Item entregado');
    };

    const handleDeleteClick = (itemId: string, name: string, status: ItemStatus) => {
        if (status === 'cooking' || status === 'delivered') {
            toast.warning("No se puede eliminar un item que se está cocinando o ya fue entregado.");
            return;
        }
        setItemToDelete({ id: itemId, name });
    };

    const confirmDelete = async () => {
        if (!activeOrder || !itemToDelete) return;

        const updatedItems = activeOrder.items.filter(i => i.id !== itemToDelete.id);
        const newTotal = updatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

        try {
            await updateDoc(doc(db, 'orders', activeOrder.id), {
                items: updatedItems,
                total: newTotal,
                updatedAt: Date.now()
            });
            toast.success(`Eliminado: ${itemToDelete.name}`);
        } catch (e) {
            console.error(e);
            toast.error('Error al eliminar item');
        } finally {
            setItemToDelete(null);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 w-full max-w-7xl h-[90vh] rounded-2xl flex overflow-hidden border border-slate-700 shadow-2xl relative">

                {/* LEFT: Menu Grid (65%) */}
                <div className="w-[65%] flex flex-col border-r border-slate-700">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 backdrop-blur">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-orange-500">📖</span> Carta
                        </h2>
                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-lg">
                            {categoriesToShow.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                                        activeCategory === cat
                                            ? "bg-white text-slate-900 shadow-lg scale-105"
                                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products */}
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4 content-start bg-slate-900/50">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 hover:border-orange-500 hover:bg-slate-800 transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-200 text-sm leading-tight mb-1">{product.name}</h3>
                                    <p className="text-[10px] text-slate-500 line-clamp-2">{product.description}</p>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-orange-400 font-bold block">S/{product.price.toFixed(2)}</span>
                                    <div className="bg-orange-500/10 text-orange-500 p-1.5 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <Plus size={14} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Order Summary (35%) */}
                <div className="w-[35%] flex flex-col bg-slate-950/50 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 z-10 text-slate-500 hover:text-white bg-slate-800/50 p-1 rounded-full">
                        <X size={20} />
                    </button>

                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-2xl font-bold text-white mb-1">Mesa {activeOrder?.tableNumber || '...'}</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock size={14} />
                            <span>{activeOrder ? 'Orden Activa' : 'Nueva Orden'}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">

                        {/* 1. Active Order Items */}
                        {activeOrder && activeOrder.items.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">En Cocina / Listos</h3>
                                <div className="space-y-2">
                                    {activeOrder.items.map((item, idx) => {
                                        const config = statusConfig[item.status || 'pending'] || statusConfig.pending;
                                        const key = item.id || idx;

                                        return (
                                            <div key={key} className={clsx(
                                                "bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center group transition-all",
                                                item.status === 'delivered' && "opacity-60 bg-emerald-900/10 border-emerald-900/30"
                                            )}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-300 text-sm">{item.quantity}x</span>
                                                        <span className={clsx("font-medium text-sm", item.status === 'delivered' ? "text-emerald-200" : "text-slate-200")}>{item.name}</span>
                                                    </div>
                                                    <div className={clsx("flex items-center gap-1 text-[10px] mt-1 font-bold", config.color)}>
                                                        <config.icon size={10} />
                                                        <span>{config.label}</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1">
                                                    {item.status === 'ready' && (
                                                        <button
                                                            onClick={() => handleMarkDelivered(item.id)}
                                                            className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition"
                                                            title="Marcar Entregado"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    {(item.status === 'pending') && (
                                                        <button
                                                            onClick={() => handleDeleteClick(item.id, item.name, item.status)}
                                                            className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition opacity-0 group-hover:opacity-100"
                                                            title="Cancelar Item"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. New Cart Items */}
                        {cart.length > 0 && (
                            <div className="animate-in slide-in-from-bottom-2">
                                <h3 className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    Por Enviar
                                </h3>
                                <div className="space-y-2">
                                    {cart.map(item => (
                                        <div key={item.cartId} className="bg-orange-900/10 border border-orange-500/20 p-3 rounded-lg flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-orange-200 text-sm">{item.quantity}x</span>
                                                        <span className="font-medium text-white text-sm">{item.name}</span>
                                                    </div>
                                                    <p className="text-xs text-orange-400">S/ {item.price.toFixed(2)}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.cartId)}
                                                    className="text-slate-500 hover:text-red-400"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            {/* Note Input */}
                                            <input
                                                type="text"
                                                placeholder="Nota (ej. sin picante)"
                                                value={item.note || ''}
                                                onChange={(e) => updateCartItemNote(item.cartId, e.target.value)}
                                                className="bg-slate-900/50 text-xs text-slate-300 border-b border-slate-700 focus:border-orange-500 outline-none w-full px-1 py-0.5"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!activeOrder && cart.length === 0 && (
                            <div className="h-40 flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                                <p>Mesa vacía</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Totals & Actions */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-slate-400">Total</span>
                            <span className="text-2xl font-bold text-white">S/ {finalTotal.toFixed(2)}</span>
                        </div>

                        {cart.length > 0 ? (
                            <button
                                onClick={handleSendOrder}
                                disabled={sending}
                                className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20"
                            >
                                {sending ? 'Enviando...' : <><Send size={18} /> Enviar a Cocina</>}
                            </button>
                        ) : activeOrder ? (
                            <button
                                onClick={() => setIsPaymentOpen(true)}
                                className="w-full bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <DollarSign size={18} />
                                Pagar / Cerrar Mesa
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PaymentOptionsModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                currentOrder={activeOrder}
                total={finalTotal}
            />

            {/* Confirm Delete Modal */}
            {itemToDelete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">¿Eliminar Item?</h3>
                            <p className="text-slate-400 text-sm">
                                ¿Quitar <span className="text-white font-bold">{itemToDelete.name}</span> de la orden?
                            </p>

                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setItemToDelete(null)}
                                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition shadow-lg shadow-red-900/20"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
