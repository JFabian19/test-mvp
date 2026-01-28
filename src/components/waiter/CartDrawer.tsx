'use client';

import { useStore } from '@/store/useStore';
import { X, Trash2, Send, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, OrderStatus } from '@/lib/types';

interface CartDrawerProps {
    currentTable: { id: string; number: string; restaurantId: string } | null;
}

export function CartDrawer({ currentTable }: CartDrawerProps) {
    const { cart, removeFromCart, updateCartItemNote, clearCart, isCartOpen, toggleCart } = useStore();
    const [sending, setSending] = useState(false);

    if (!isCartOpen) return null;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSendOrder = async () => {
        if (!currentTable || cart.length === 0) return;
        setSending(true);

        try {
            // Create Order
            const newOrder: Omit<Order, 'id'> = {
                restaurantId: currentTable.restaurantId,
                tableId: currentTable.id,
                tableNumber: currentTable.number,
                items: cart.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    note: item.note
                })),
                status: 'pending',
                total: total,
                createdAt: Date.now(), // Use serverTimestamp() in real app mostly, but simplified types for now
                updatedAt: Date.now(),
            };

            const orderRef = await addDoc(collection(db, 'orders'), {
                ...newOrder,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Update Table Status
            await updateDoc(doc(db, 'tables', currentTable.id), {
                status: 'occupied',
                currentOrderId: orderRef.id
            });

            clearCart();
            toggleCart(); // Close
            alert('Pedido enviado a cocina!'); // Simple feedback
        } catch (error) {
            console.error("Error sending order:", error);
            alert('Error al enviar pedido');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-slate-900 shadow-2xl border-l border-slate-700 flex flex-col transform transition-transform">
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
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => removeFromCart(item.cartId)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
                <div className="flex justify-between items-center mb-4 text-xl font-bold">
                    <span className="text-slate-300">Total</span>
                    <span className="text-white">S/ {total.toFixed(2)}</span>
                </div>
                <button
                    onClick={handleSendOrder}
                    disabled={cart.length === 0 || sending || !currentTable}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                    {sending ? 'Enviando...' : <><Send size={20} /> Enviar a Cocina</>}
                </button>
            </div>
        </div>
    );
}
