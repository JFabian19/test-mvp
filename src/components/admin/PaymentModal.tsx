'use client';

import { Order, Table } from '@/lib/types';
import { X, CreditCard, Banknote, Landmark } from 'lucide-react'; // Landmark for Yape/Plin icon approx
import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table;
    order: Order | null;
}

export function PaymentModal({ isOpen, onClose, table, order }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handlePayment = async (method: 'Efectivo' | 'Tarjeta' | 'Yape/Plin') => {
        if (!order) return;
        setLoading(true);

        try {
            // Close Order
            // In real app, might create a 'payments' collection
            await updateDoc(doc(db, 'orders', order.id), {
                status: 'delivered', // or 'paid'
                paymentMethod: method,
                closedAt: serverTimestamp()
            });

            // Free Table
            await updateDoc(doc(db, 'tables', table.id), {
                status: 'free',
                currentOrderId: null
            });

            onClose();
            alert(`Mesa cerrada. Pago: ${method}`);
        } catch (error) {
            console.error("Error closing table:", error);
            alert("Error al cerrar mesa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl flex flex-col overflow-hidden border border-slate-700 shadow-2xl">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl font-bold text-white">Cerrar Mesa {table.number}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {!order ? (
                        <p className="text-slate-400 text-center">No hay orden activa en esta mesa.</p>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h3 className="text-sm text-slate-400 mb-2">Resumen</h3>
                                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-2">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-slate-300 text-sm">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>S/ {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-600 pt-2 flex justify-between text-lg font-bold text-white">
                                        <span>Total</span>
                                        <span>S/ {order.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm text-slate-400 mb-2">Método de Pago</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => handlePayment('Efectivo')}
                                    disabled={loading}
                                    className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all font-medium text-emerald-400"
                                >
                                    <Banknote size={24} /> Efectivo
                                </button>
                                <button
                                    onClick={() => handlePayment('Yape/Plin')}
                                    disabled={loading}
                                    className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all font-medium text-purple-400"
                                >
                                    <Landmark size={24} /> Yape / Plin
                                </button>
                                <button
                                    onClick={() => handlePayment('Tarjeta')}
                                    disabled={loading}
                                    className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all font-medium text-blue-400"
                                >
                                    <CreditCard size={24} /> Tarjeta
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
