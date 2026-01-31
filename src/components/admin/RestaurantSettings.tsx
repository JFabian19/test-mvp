'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PaymentMethod, ThemeColor } from '@/lib/types';
import { toast } from 'sonner';
import { Save, Wallet, QrCode, CreditCard, Palette, Store, Trash2, Plus, Upload, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export function RestaurantSettings() {
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [uploadingMethodId, setUploadingMethodId] = useState<string | null>(null);

    // Dirty States
    const [nameChanged, setNameChanged] = useState(false);
    const [paymentsChanged, setPaymentsChanged] = useState(false);

    useEffect(() => {
        if (restaurant) {
            setName(restaurant.name || '');

            // Merge existing settings with standard defaults
            const savedMethods = restaurant.paymentMethods || [];
            // Updated defaults: Removed Apple/Google Pay, Renamed 'Card' to 'POS'
            const standardNames = ['Efectivo', 'POS', 'Yape', 'Plin'];
            const defaults: PaymentMethod[] = [
                { id: '1', name: 'Efectivo', type: 'cash', isActive: true },
                { id: '2', name: 'POS', type: 'card', isActive: true }, // name 'POS', type still 'card'
                { id: '3', name: 'Yape', type: 'qr', isActive: true },
                { id: '4', name: 'Plin', type: 'qr', isActive: true },
            ];

            // Create final list: use saved if exists, else default
            const mergedMethods = defaults.map(def => {
                // Determine if we should map old 'Tarjeta' to 'POS' if it exists with old name
                const existing = savedMethods.find(m => m.name === def.name || (def.name === 'POS' && m.name === 'Tarjeta'));
                if (existing) {
                    // Update name if it was 'Tarjeta'
                    if (existing.name === 'Tarjeta') return { ...existing, name: 'POS' };
                    return existing;
                }
                return def;
            });

            setPaymentMethods(mergedMethods);
        }
    }, [restaurant]);

    // Check for changes
    useEffect(() => {
        if (restaurant) {
            setNameChanged(name !== restaurant.name);

            // Prepare saved payment methods for comparison, handling legacy 'Tarjeta'
            const savedPaymentsForComparison = (restaurant.paymentMethods || []).map(p => {
                if (p.name === 'Tarjeta') return { ...p, name: 'POS' };
                return p;
            });

            // Sort both arrays by ID to ensure consistent stringification
            const sortedSaved = JSON.stringify(savedPaymentsForComparison.sort((a, b) => a.id.localeCompare(b.id)));
            const sortedCurrent = JSON.stringify([...paymentMethods].sort((a, b) => a.id.localeCompare(b.id)));

            setPaymentsChanged(sortedSaved !== sortedCurrent);
        }
    }, [name, paymentMethods, restaurant]);

    const handleSaveName = async () => {
        if (!restaurant) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'restaurants', restaurant.id), {
                name,
                updatedAt: Date.now()
            });
            toast.success("Nombre actualizado");
            setNameChanged(false);
        } catch (e) {
            console.error(e);
            toast.error("Error al guardar nombre");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePayments = async () => {
        if (!restaurant) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'restaurants', restaurant.id), {
                paymentMethods,
                updatedAt: Date.now()
            });
            toast.success("Métodos de pago guardados");
            setPaymentsChanged(false);
        } catch (e) {
            console.error(e);
            toast.error("Error al guardar pagos");
        } finally {
            setLoading(false);
        }
    };

    const handleQrUpload = async (file: File, methodId: string) => {
        if (!restaurant) return;
        setUploadingMethodId(methodId);
        try {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("La imagen es muy pesada (max 5MB)");
                setUploadingMethodId(null);
                return;
            }

            // Keep original extension or fallback to jpg
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `qrs/${restaurant.id}/${methodId}_${Date.now()}.${fileExt}`;
            const storageRef = ref(storage, fileName);

            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            setPaymentMethods(prev => prev.map(p =>
                p.id === methodId ? { ...p, qrUrl: url } : p
            ));

            toast.success("QR subido correctamente");
        } catch (error) {
            console.error("Error uploading QR:", error);
            toast.error("Error al subir QR");
        } finally {
            setUploadingMethodId(null);
        }
    };

    const handlePhoneChange = (methodId: string, phone: string) => {
        setPaymentMethods(prev => prev.map(p =>
            p.id === methodId ? { ...p, phoneNumber: phone } : p
        ));
    };

    const togglePaymentMethod = (id: string) => {
        setPaymentMethods(prev => prev.map(p =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
        ));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Store className="text-blue-500" />
                        Configuración del Restaurante
                    </h2>
                    <p className="text-slate-400">Personaliza la identidad y opciones de tu negocio.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Restaurant Identity */}
                <div className="space-y-6 h-fit">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-lg font-bold text-white mb-4">Datos del Negocio</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nombre del Restaurante</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ej. El Buen Sabor"
                                />
                            </div>
                        </div>
                        {/* Granular Save Button for Name */}
                        {nameChanged && (
                            <div className="mt-4 flex justify-end animate-in fade-in">
                                <button
                                    onClick={handleSaveName}
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all"
                                >
                                    <Save size={16} /> Guardar Nombre
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* SUNAT Integration (Coming Soon) */}
                <div className="space-y-6 h-fit">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 relative overflow-hidden group">

                        {/* Coming Soon Overlay/Badge */}
                        <div className="absolute top-0 right-0 p-4">
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/20 animate-pulse">
                                PRÓXIMAMENTE
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-slate-400">📠</span> Facturación - SUNAT
                        </h3>

                        <div className="space-y-4 opacity-50 pointer-events-none select-none grayscale-[0.5] transition-all group-hover:grayscale-0 group-hover:opacity-60">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">RUC del Negocio</label>
                                <input
                                    type="text"
                                    disabled
                                    placeholder="20123456789"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Clave SOL</label>
                                <input
                                    type="password"
                                    disabled
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-500"
                                />
                            </div>
                            <button disabled className="w-full py-2 bg-blue-900/40 border border-blue-900 text-blue-400 rounded-lg font-bold flex items-center justify-center gap-2">
                                🔗 Conectar con SUNAT
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Payment Methods */}
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Wallet size={20} className="text-emerald-500" />
                            Métodos de Pago
                        </h3>
                        {/* Granular Save Button for Payments */}
                        {paymentsChanged && (
                            <button
                                onClick={handleSavePayments}
                                disabled={loading}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg animate-in fade-in transition-all"
                            >
                                <Save size={16} /> Guardar Cambios
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {paymentMethods.map(method => (
                            <div key={method.id} className={clsx(
                                "rounded-xl border transition-all duration-200 overflow-hidden",
                                method.isActive ? "bg-slate-900 border-blue-500/50" : "bg-slate-950 border-slate-800 opacity-75"
                            )}>
                                {/* Header Row */}
                                <div className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("p-3 rounded-xl transition-colors",
                                            method.isActive
                                                ? (method.type === 'cash' ? "bg-green-500/20 text-green-500" :
                                                    method.type === 'qr' ? "bg-purple-500/20 text-purple-500" :
                                                        "bg-blue-500/20 text-blue-500")
                                                : "bg-slate-800 text-slate-500"
                                        )}>
                                            {method.type === 'cash' && <Wallet size={24} />}
                                            {method.type === 'qr' && <QrCode size={24} />}
                                            {(method.type === 'card' || method.type === 'other') && <CreditCard size={24} />}
                                            {(method.type === 'apple_pay' || method.type === 'google_pay') && <Smartphone size={24} />}
                                        </div>
                                        <div>
                                            <p className={clsx("font-bold text-lg", method.isActive ? "text-white" : "text-slate-400")}>
                                                {method.name}
                                            </p>
                                        </div>
                                    </div>

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={method.isActive}
                                            onChange={() => togglePaymentMethod(method.id)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Configuration Config for QR (Yape/Plin) */}
                                {method.isActive && method.type === 'qr' && (
                                    <div className="bg-slate-950/50 border-t border-slate-800 p-4 space-y-4 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Phone Number Input */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Número de Celular</label>
                                                <div className="relative">
                                                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                                    <input
                                                        type="text"
                                                        value={method.phoneNumber || ''}
                                                        onChange={(e) => handlePhoneChange(method.id, e.target.value)}
                                                        placeholder="9xx xxx xxx"
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* QR Upload */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Imagen QR</label>
                                                <div className="flex items-start gap-4">
                                                    {method.qrUrl ? (
                                                        <div className="relative group/qr">
                                                            <img
                                                                src={method.qrUrl}
                                                                alt="QR"
                                                                className="w-20 h-20 rounded-lg object-cover border border-slate-700"
                                                            />
                                                            <button
                                                                onClick={() => setPaymentMethods(prev => prev.map(p => p.id === method.id ? { ...p, qrUrl: '' } : p))}
                                                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/qr:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1">
                                                            <label className={clsx(
                                                                "flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-900 transition-colors",
                                                                uploadingMethodId === method.id ? "border-yellow-500/50 bg-yellow-500/5" : "border-slate-700 hover:border-slate-500"
                                                            )}>
                                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                                    {uploadingMethodId === method.id ? (
                                                                        <span className="text-xs text-yellow-500 animate-pulse font-bold">Subiendo QR...</span>
                                                                    ) : (
                                                                        <>
                                                                            <Upload size={20} className="text-slate-500 mb-1" />
                                                                            <p className="text-[10px] text-slate-500">Subir QR</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => e.target.files?.[0] && handleQrUpload(e.target.files[0], method.id)}
                                                                    disabled={!!uploadingMethodId}
                                                                />
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
