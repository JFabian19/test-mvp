'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Category } from '@/lib/types';
import { Plus, Trash2, Camera, Upload, Save, X, Sparkles } from 'lucide-react';

export function MenuManager() {
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Scan State
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [scanFile, setScanFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedItems, setScannedItems] = useState<Partial<Product>[]>([]);

    useEffect(() => {
        if (!user?.restaurantId) return;

        const q = query(
            collection(db, 'products'),
            where('restaurantId', '==', user.restaurantId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetched);
            setLoading(false);
        });

        return () => unsub();
    }, [user?.restaurantId]);

    const handleScan = async () => {
        if (!scanFile) return;
        setIsScanning(true);

        const formData = new FormData();
        formData.append('file', scanFile);

        try {
            const res = await fetch('/api/scan-menu', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                setScannedItems(data.items);
            }
        } catch (e) {
            console.error(e);
            alert('Error al escanear menú');
        } finally {
            setIsScanning(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveScanned = async () => {
        if (!restaurant) return;
        setIsSaving(true);

        try {
            // Batch add (or simple loop for MVP)
            const promises = scannedItems.map(item => {
                return addDoc(collection(db, 'products'), {
                    restaurantId: restaurant.id,
                    name: item.name || 'Sin nombre',
                    price: Number(item.price) || 0,
                    category: item.category || 'Otros',
                    description: item.description || '',
                    active: true,
                    imageUrl: '' // Pending image upload logic
                });
            });

            await Promise.all(promises);
            setIsScanModalOpen(false);
            setScannedItems([]);
            setScanFile(null);
            alert('¡Productos importados exitosamente!');
        } catch (e) {
            console.error(e);
            alert('Error al guardar productos');
        } finally {
            setIsSaving(false);
        }
    };

    // ... (rest of code) ...

    {
        scannedItems.length > 0 && (
            <div className="p-4 border-t border-slate-700 bg-slate-900 sticky bottom-0">
                <button
                    onClick={handleSaveScanned}
                    disabled={isSaving}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg flex justify-center items-center gap-2 transition-colors"
                >
                    {isSaving ? (
                        <>Guardando...</>
                    ) : (
                        <><Save size={20} /> Guardar Todo en el Menú</>
                    )}
                </button>
            </div>
        )
    }

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar este producto?')) {
            await deleteDoc(doc(db, 'products', id));
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando menú...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Carta del Restaurante</h2>
                <button
                    onClick={() => setIsScanModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-2 rounded-full font-bold shadow-lg transition-all hover:scale-105"
                >
                    <Sparkles size={18} />
                    Importar con IA
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                    <div key={product.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-start group">
                        <div>
                            <h4 className="font-bold text-slate-200">{product.name}</h4>
                            <p className="text-sm text-slate-500 mb-2">{product.description}</p>
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded">{product.category}</span>
                                <span className="font-bold text-orange-400">S/ {product.price.toFixed(2)}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Scan Modal */}
            {isScanModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="text-purple-400" />
                                Escanear Menú con IA
                            </h3>
                            <button onClick={() => setIsScanModalOpen(false)}><X className="text-slate-400" /></button>
                        </div>

                        <div className="p-6 space-y-6 flex-1">
                            {!scannedItems.length ? (
                                <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center hover:border-blue-500 transition-colors bg-slate-950/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="menu-upload"
                                    />
                                    <label htmlFor="menu-upload" className="cursor-pointer flex flex-col items-center">
                                        <Upload size={48} className="text-slate-500 mb-4" />
                                        <p className="text-lg font-medium text-slate-300">Sube una foto de tu carta</p>
                                        <p className="text-sm text-slate-500 mt-2">La IA detectará platos, precios y descripciones.</p>
                                    </label>

                                    {scanFile && (
                                        <div className="mt-6 bg-slate-800 p-4 rounded-lg flex items-center justify-between">
                                            <span className="text-sm text-slate-300 truncate">{scanFile.name}</span>
                                            <button
                                                onClick={handleScan}
                                                disabled={isScanning}
                                                className="bg-purple-600 px-4 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-50"
                                            >
                                                {isScanning ? 'Analizando...' : 'Procesar Imagen'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-green-400 text-sm font-bold">{scannedItems.length} ítems detectados</p>
                                        <button onClick={() => setScannedItems([])} className="text-xs text-slate-400 underline">Volver a escanear</button>
                                    </div>

                                    <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-2">
                                        {scannedItems.map((item, idx) => (
                                            <div key={idx} className="bg-slate-950 p-3 rounded flex gap-3 border border-slate-800">
                                                <div className="flex-1">
                                                    <input
                                                        value={item.name}
                                                        onChange={e => {
                                                            const newItems = [...scannedItems];
                                                            newItems[idx].name = e.target.value;
                                                            setScannedItems(newItems);
                                                        }}
                                                        className="bg-transparent font-bold text-slate-200 w-full outline-none border-b border-transparent focus:border-slate-700"
                                                    />
                                                    <input
                                                        value={item.description}
                                                        onChange={e => {
                                                            const newItems = [...scannedItems];
                                                            newItems[idx].description = e.target.value;
                                                            setScannedItems(newItems);
                                                        }}
                                                        className="bg-transparent text-xs text-slate-500 w-full outline-none"
                                                        placeholder="Descripción"
                                                    />
                                                </div>
                                                <div className="w-20">
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={e => {
                                                            const newItems = [...scannedItems];
                                                            newItems[idx].price = Number(e.target.value);
                                                            setScannedItems(newItems);
                                                        }}
                                                        className="bg-slate-800 text-right text-orange-400 font-bold w-full rounded px-2 py-1 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {scannedItems.length > 0 && (
                            <div className="p-4 border-t border-slate-700 bg-slate-900 sticky bottom-0">
                                <button
                                    onClick={handleSaveScanned}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg flex justify-center items-center gap-2"
                                >
                                    <Save size={20} /> Guardar Todo en el Menú
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
