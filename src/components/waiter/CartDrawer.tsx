'use client';

import { useStore } from '@/store/useStore';
import { X, Trash2, Send, MessageSquare, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Table } from '@/lib/types';
import { toast } from 'sonner';

interface CartDrawerProps {
    currentTable: Table | null;
}

export function CartDrawer({ currentTable }: CartDrawerProps) {
    const { cart, removeFromCart, updateCartItemNote, clearCart, isCartOpen, toggleCart } = useStore();
    const [sending, setSending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isCartOpen) return null;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSendClick = () => {
        if (!currentTable || cart.length === 0) return;
        setIsConfirming(true);
    };

    const handleConfirmSend = async () => {
        setIsConfirming(false);
        setSending(true);

        try {
            if (currentTable?.currentOrderId) {
                // Fetch current order to update it
                const orderRef = doc(db, 'orders', currentTable.currentOrderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const currentOrder = orderSnap.data() as Order;

                    const newItems = cart.map(item => ({
                        id: crypto.randomUUID(),
                        productId: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        note: item.note,
                        status: 'pending' as const
                    }));

                    const updatedItems = [...currentOrder.items, ...newItems];
                    const newTotal = updatedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                    await updateDoc(orderRef, {
                        items: updatedItems,
                        total: newTotal,
                        updatedAt: Date.now(),
                        status: currentOrder.status === 'delivered' ? 'pending' : currentOrder.status
                    });

                    toast.success('Items agregados a la orden');
                } else {
                    await createNewOrder();
                }
            } else {
                await createNewOrder();
            }

            clearCart();
            toggleCart();
        } catch (error) {
            console.error("Error sending order:", error);
            toast.error('Error al enviar pedido');
        } finally {
            setSending(false);
        }
    };

    const createNewOrder = async () => {
        if (!currentTable) return;

        const newOrder = {
            restaurantId: currentTable.restaurantId,
            tableId: currentTable.id,
            tableNumber: currentTable.number,
            items: cart.map(item => ({
                id: crypto.randomUUID(),
                productId: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                note: item.note,
                status: 'pending' as const
            })),
            status: 'pending' as const,
            total: total,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const orderRef = await addDoc(collection(db, 'orders'), {
            ...newOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await updateDoc(doc(db, 'tables', currentTable.id), {
            status: 'occupied',
            currentOrderId: orderRef.id
        });
        toast.success('Nuevo pedido creado');
    };

    return (
        <div className="fixed inset-y-0 right-0 z-[60] w-full md:w-96 bg-slate-900 shadow-2xl border-l border-slate-700 flex flex-col transform transition-transform">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white">Pedido actual</h2>
                    {currentTable && <p className="text-orange-400 text-sm">Mesa {currentTable.number}</p>}
                </div>
                <button onClick={toggleCart} className="p-2 hover:bg-slate-700 rounded-full">
                    <X size={24} className="text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10">
                        <p>Carrito vacío</p>
                        <p className="text-sm">Selecciona productos del menú</p>
                    </div>
                ) : (
                    cart.map((item) => (
                        <div key={item.cartId} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-slate-200">{item.name}</span>
                                <span className="font-bold text-orange-400">S/ {item.price.toFixed(2)}</span>
                            </div>

                            {/* Notes Input */}
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={16} className="text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Notas (ej: Sin picante)"
                                    value={item.note || ''}
                                    onChange={(e) => updateCartItemNote(item.cartId, e.target.value)}
                                    className="bg-transparent border-b border-slate-600 text-sm text-slate-300 w-full focus:border-orange-500 outline-none placeholder:text-slate-600"
                                    autoFocus // Suggest focusing on notes when added? Maybe annoying. Remove if so.
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => removeFromCart(item.cartId)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="Quitar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700 relative">
                <div className="flex justify-between items-center mb-4 text-xl font-bold">
                    <span className="text-slate-300">Total</span>
                    <span className="text-white">S/ {total.toFixed(2)}</span>
                </div>
                <button
                    onClick={handleSendClick}
                    disabled={cart.length === 0 || sending || !currentTable}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    {sending ? 'Enviando...' : <><Send size={20} /> Enviar a Cocina</>}
                </button>

                {/* Confirm Overlay */}
                {isConfirming && (
                    <div className="absolute inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 p-6 animate-in slide-in-from-bottom duration-200 z-10 rounded-t-2xl shadow-2xl">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-1">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="font-bold text-white text-lg">¿Confirmar Pedido?</h3>
                            <p className="text-slate-400 text-sm mb-2">
                                Se enviarán {cart.length} items a cocina por <span className="text-white font-bold">S/ {total.toFixed(2)}</span>
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmSend}
                                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-900/20 active:scale-[0.98]"
                                >
                                    Sí, Enviar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
