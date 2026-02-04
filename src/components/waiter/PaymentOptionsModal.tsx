'use client';

import { useState } from 'react';
import { X, DollarSign, CreditCard, Smartphone, QrCode } from 'lucide-react';
import { clsx } from 'clsx';
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/lib/types';
import { toast } from 'sonner';

import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuth } from '@/hooks/useAuth';
import { PaymentMethod } from '@/lib/types';

interface PaymentOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentOrder: Order | null;
    total: number;
}

export function PaymentOptionsModal({ isOpen, onClose, currentOrder, total }: PaymentOptionsModalProps) {
    const { restaurant } = useRestaurant();
    const { user } = useAuth();
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    if (!isOpen || !currentOrder) return null;

    const activeMethods = restaurant?.paymentMethods?.filter(m => m.isActive) || [];
    const selectedMethod = activeMethods.find(m => m.id === selectedMethodId);

    const handlePayment = async () => {
        if (!selectedMethod || !restaurant || !user) return;
        setLoading(true);
        try {
            const receiptCode = `BOL-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;

            // 1. Create Receipt (Immutable Record)
            await addDoc(collection(db, 'receipts'), {
                restaurantId: restaurant.id,
                orderId: currentOrder.id,
                tableNumber: currentOrder.tableNumber,
                items: currentOrder.items,
                total: total,
                paymentMethod: selectedMethod.name,
                closedBy: {
                    uid: user.uid,
                    name: user.displayName || 'Unknown',
                    role: user.role
                },
                closedAt: Date.now(),
                code: receiptCode
            });

            // 2. Update Order
            // Si es 'takeout', NO la completamos aún. El usuario debe dar click en "Despachar".
            // Si es Mesa, sí cerramos la orden y liberamos mesa.
            const isTakeout = currentOrder.type === 'takeout';

            const updateData: any = {
                paymentMethod: selectedMethod.name,
                paidAt: Date.now(),
                receiptCode: receiptCode
            };

            if (!isTakeout) {
                updateData.status = 'completed';
            } else {
                // Logic for Takeout:
                // If "Pay After" (Default): Paying means transaction is done & food handed over -> Complete.
                // If "Pay Before": Paying means just the start -> Keep open for Kitchen/Dispatch.
                const timing = restaurant.takeoutPaymentTiming || 'after';
                if (timing === 'after') {
                    updateData.status = 'completed';
                }
                // If 'before', we do nothing to status (it remains pending/cooking/ready), waiting for manual Dispatch.
            }

            await updateDoc(doc(db, 'orders', currentOrder.id), updateData);

            // 3. Free Table (Only if NOT takeout)
            if (!isTakeout && currentOrder.tableId) {
                await updateDoc(doc(db, 'tables', currentOrder.tableId), {
                    status: 'free',
                    currentOrderId: null
                });
            }

            toast.success(`Pago exitoso. Boleta: ${receiptCode}`, {
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

                <div className="grid grid-cols-2 gap-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                    {activeMethods.map(method => (
                        <button
                            key={method.id}
                            onClick={() => setSelectedMethodId(method.id)}
                            className={clsx(
                                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                                selectedMethodId === method.id
                                    ? "bg-blue-900/30 border-blue-500 text-blue-400 scale-95"
                                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-500"
                            )}
                        >
                            {method.type === 'cash' && <DollarSign size={28} />}
                            {(method.type === 'card' || method.type === 'other') && <CreditCard size={28} />}
                            {method.type === 'qr' && <QrCode size={28} />}
                            {(method.type === 'apple_pay' || method.type === 'google_pay') && <Smartphone size={28} />}
                            <span className="font-bold text-sm">{method.name}</span>
                        </button>
                    ))}
                    {activeMethods.length === 0 && (
                        <p className="col-span-2 text-center text-slate-500 text-sm">No hay métodos de pago activos.</p>
                    )}
                </div>

                {selectedMethod?.type === 'qr' && (
                    <div className="mb-6 flex flex-col items-center animate-in fade-in zoom-in duration-300 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div className="bg-white p-2 rounded-xl mb-2 shadow-lg">
                            {selectedMethod.qrUrl && (
                                <img
                                    src={selectedMethod.qrUrl}
                                    alt={`QR ${selectedMethod.name}`}
                                    className="w-40 h-40 object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => setZoomImage(selectedMethod.qrUrl!)}
                                />
                            )}
                        </div>
                        <p className="text-white font-bold text-lg">{selectedMethod.name}</p>
                        <p className="text-xs text-slate-400 text-center max-w-[200px]">
                            Escanea para pagar <span className="text-emerald-400 font-bold">S/ {total.toFixed(2)}</span>
                        </p>
                        {selectedMethod.phoneNumber && (
                            <div className="mt-3 text-center">
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Número</p>
                                <p className="text-2xl font-mono text-white tracking-widest font-bold">{selectedMethod.phoneNumber}</p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={!selectedMethod || loading}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all"
                >
                    {loading ? 'Procesando...' : 'Confirmar Pago y Cerrar'}
                </button>
            </div>

            {/* Image Zoom Modal */}
            {zoomImage && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200" onClick={() => setZoomImage(null)}>
                    <button
                        onClick={() => setZoomImage(null)}
                        className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={zoomImage}
                        alt="QR Fullscreen"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
