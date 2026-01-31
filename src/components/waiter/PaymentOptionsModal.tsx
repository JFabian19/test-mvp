'use client';

import { useState } from 'react';
import { X, DollarSign, CreditCard, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/lib/types';
import { toast } from 'sonner';

interface PaymentOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentOrder: Order | null;
    total: number;
}

type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Yape' | 'Plin';

export function PaymentOptionsModal({ isOpen, onClose, currentOrder, total }: PaymentOptionsModalProps) {
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen || !currentOrder) return null;

    const handlePayment = async () => {
        if (!method) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'orders', currentOrder.id), {
                status: 'completed',
                paymentMethod: method,
                paidAt: Date.now()
            });

            await updateDoc(doc(db, 'tables', currentOrder.tableId!), {
                status: 'free',
                currentOrderId: null
            });

            toast.success(`Pago registrado: ${method}`, {
                description: `Mesa ${currentOrder.tableNumber} liberada.`
            });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al registrar pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Método de Pago</h2>
                <p className="text-slate-400 mb-6">Mesa {currentOrder.tableNumber} - Total: <span className="text-emerald-400 font-bold text-lg">S/ {total.toFixed(2)}</span></p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => setMethod('Efectivo')}
                        className={clsx(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                            method === 'Efectivo' ? "bg-emerald-900/30 border-emerald-500 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        <DollarSign size={32} />
                        <span className="font-bold">Efectivo</span>
                    </button>
                    <button
                        onClick={() => setMethod('Tarjeta')}
                        className={clsx(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                            method === 'Tarjeta' ? "bg-blue-900/30 border-blue-500 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        <CreditCard size={32} />
                        <span className="font-bold">Tarjeta</span>
                    </button>
                    <button
                        onClick={() => setMethod('Yape')}
                        className={clsx(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                            method === 'Yape' ? "bg-purple-900/30 border-purple-500 text-purple-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        <Smartphone size={32} />
                        <span className="font-bold">Yape</span>
                    </button>
                    <button
                        onClick={() => setMethod('Plin')}
                        className={clsx(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                            method === 'Plin' ? "bg-cyan-900/30 border-cyan-500 text-cyan-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        <Smartphone size={32} />
                        <span className="font-bold">Plin</span>
                    </button>
                </div>

                {(method === 'Yape' || method === 'Plin') && (
                    <div className="mb-6 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-white p-2 rounded-xl mb-2">
                            {/* Placeholder QR using method name */}
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=payment-${method}-${total}`}
                                alt="QR Pago"
                                className="w-40 h-40"
                            />
                        </div>
                        <p className="text-white font-mono text-lg tracking-widest">987 654 321</p>
                        <p className="text-xs text-slate-500 uppercase">{method === 'Yape' ? 'BCP - Juan Perez' : 'BBVA - Juan Perez'}</p>
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={!method || loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all"
                >
                    {loading ? 'Procesando...' : 'Confirmar Pago y Cerrar'}
                </button>
            </div>
        </div>
    );
}
