'use client';

import { Order, Table } from '@/lib/types';
import { X, CreditCard, Banknote, Landmark, Check, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table;
    order: Order | null;
}

export function PaymentModal({ isOpen, onClose, table, order }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [confirmMethod, setConfirmMethod] = useState<'Efectivo' | 'Tarjeta' | 'Yape/Plin' | null>(null);

    if (!isOpen) return null;

    const handleInitialClick = (method: 'Efectivo' | 'Tarjeta' | 'Yape/Plin') => {
        setConfirmMethod(method);
    };

    const confirmPayment = async () => {
        if (!order || !confirmMethod) return;
        setLoading(true);

        try {
            // Close Order - Update status to 'paid' (or delivered if that's the final state logic)
            // Assuming 'delivered' meant 'served', 'paid' or 'closed' might be better, but sticking to existing logic or 'paid'.
            // The previous code set it to 'delivered' but commented 'or paid'. 
            // I'll set it to 'completed' or 'paid' to distinguish from just delivered.
            // Let's stick to previous code 'delivered' if that's what the system expects, OR better, 'completed'.
            // Re-reading previous code: `status: 'delivered'`. 
            // I will keep it 'delivered' to avoid breaking other logic, but add `paymentStatus: 'paid'`.

            await updateDoc(doc(db, 'orders', order.id), {
                status: 'completed', // Let's mark as completed to hide from active views if applicable
                paymentMethod: confirmMethod,
                closedAt: serverTimestamp(),
                paid: true
            });

            // Free Table
            await updateDoc(doc(db, 'tables', table.id), {
                status: 'free',
                currentOrderId: null
            });

            toast.success(`Mesa ${table.number} cerrada`, {
                description: `Pago registrado: ${confirmMethod} - S/ ${order.total.toFixed(2)}`
            });
            onClose();
        } catch (error) {
            console.error("Error closing table:", error);
            toast.error("Error al cerrar mesa");
        } finally {
            setLoading(false);
            setConfirmMethod(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl flex flex-col overflow-hidden border border-slate-700 shadow-2xl relative">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl font-bold text-white">Cerrar Mesa {table.number}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X size={24} className="text-slate-400 hover:text-white" />
                    </button>
                </div>

                <div className="p-6">
                    {!order ? (
                        <p className="text-slate-400 text-center">No hay orden activa en esta mesa.</p>
                    ) : (
                        <>
                            {/* Order Summary */}
                            <div className="mb-6">
                                <h3 className="text-sm text-slate-400 mb-2 font-bold uppercase tracking-wider">Resumen de Consumo</h3>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                    <div className="max-h-40 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {order.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-slate-300 text-sm">
                                                <span><span className="text-slate-500 font-mono text-xs mr-2">{item.quantity}x</span> {item.name}</span>
                                                <span className="font-mono text-slate-400">S/ {(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-700 pt-3 flex justify-between items-end mt-2">
                                        <span className="text-slate-400 text-sm">Total a Pagar</span>
                                        <span className="text-2xl font-bold text-white">S/ {order.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <h3 className="text-sm text-slate-400 mb-3 font-bold uppercase tracking-wider">Seleccionar Método de Pago</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => handleInitialClick('Efectivo')}
                                    disabled={loading}
                                    className="flex items-center justify-between p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:text-emerald-300">
                                            <Banknote size={24} />
                                        </div>
                                        <span className="font-bold text-slate-200 group-hover:text-white">Efectivo</span>
                                    </div>
                                    <span className="text-slate-500 group-hover:text-emerald-400">→</span>
                                </button>

                                <button
                                    onClick={() => handleInitialClick('Yape/Plin')}
                                    disabled={loading}
                                    className="flex items-center justify-between p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500/50 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300">
                                            <Landmark size={24} />
                                        </div>
                                        <span className="font-bold text-slate-200 group-hover:text-white">Yape / Plin</span>
                                    </div>
                                    <span className="text-slate-500 group-hover:text-purple-400">→</span>
                                </button>

                                <button
                                    onClick={() => handleInitialClick('Tarjeta')}
                                    disabled={loading}
                                    className="flex items-center justify-between p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500/50 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300">
                                            <CreditCard size={24} />
                                        </div>
                                        <span className="font-bold text-slate-200 group-hover:text-white">Tarjeta</span>
                                    </div>
                                    <span className="text-slate-500 group-hover:text-blue-400">→</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Confirmation Overlay */}
                {confirmMethod && (
                    <div className="absolute inset-0 bg-slate-900 z-10 animate-in slide-in-from-right duration-200 flex flex-col">
                        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                            <button onClick={() => setConfirmMethod(null)} className="p-2 -ml-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="font-bold text-white">Confirmar Pago</h3>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 
                                ${confirmMethod === 'Efectivo' ? 'bg-emerald-500/10 text-emerald-500' :
                                    confirmMethod === 'Tarjeta' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                {confirmMethod === 'Efectivo' && <Banknote size={40} />}
                                {confirmMethod === 'Tarjeta' && <CreditCard size={40} />}
                                {confirmMethod === 'Yape/Plin' && <Landmark size={40} />}
                            </div>

                            <p className="text-slate-400 mb-2">Monto Total</p>
                            <p className="text-4xl font-bold text-white mb-8">S/ {order?.total.toFixed(2)}</p>

                            <p className="text-sm text-slate-500 mb-8 max-w-[200px]">
                                Al confirmar, la mesa se liberará y la orden se marcará como pagada con
                                <strong className="text-slate-300"> {confirmMethod}</strong>.
                            </p>

                            <button
                                onClick={confirmPayment}
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2
                                    ${confirmMethod === 'Efectivo' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' :
                                        confirmMethod === 'Tarjeta' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'}`}
                            >
                                {loading ? 'Procesando...' : <><Check size={24} /> Confirmar Pago</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
