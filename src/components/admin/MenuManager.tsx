'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/lib/types';
import { Plus, Trash2, Upload, Save, X, Sparkles, Edit, AlertCircle, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

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
    const [isSaving, setIsSaving] = useState(false);

    // Product Modal State (Add/Edit)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: '',
        description: '',
        newCategory: ''
    });
    const [isSavingProduct, setIsSavingProduct] = useState(false);

    // Confirmation States
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToSave, setProductToSave] = useState<{ id: string, data: any } | null>(null);

    // Derived Categories
    const categories = Array.from(new Set(products.map(p => p.category))).sort();

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

    // --- AI SCAN LOGIC ---
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
                toast.error('Error: ' + data.error);
            } else {
                setScannedItems(data.items);
                toast.success('Menú escaneado correctamente');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error al escanear menú');
        } finally {
            setIsScanning(false);
        }
    };

    const handleSaveScanned = async () => {
        if (!restaurant) {
            toast.error("Error: No se ha cargado la información del restaurante.");
            return;
        }
        setIsSaving(true);

        try {
            const promises = scannedItems.map(item => {
                return addDoc(collection(db, 'products'), {
                    restaurantId: restaurant.id,
                    name: item.name || 'Sin nombre',
                    price: Number(item.price) || 0,
                    category: item.category || 'Otros',
                    description: item.description || '',
                    active: true,
                    imageUrl: ''
                });
            });

            await Promise.all(promises);
            setIsScanModalOpen(false);
            setScannedItems([]);
            setScanFile(null);
            toast.success('¡Productos importados exitosamente!');
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar productos');
        } finally {
            setIsSaving(false);
        }
    };

    // --- CRUD LOGIC ---
    const handleOpenAdd = () => {
        setEditingProduct(null);
        // Default category
        setFormData({
            name: '',
            price: '',
            category: categories.length > 0 ? categories[0] : 'Entradas',
            description: '',
            newCategory: ''
        });
        setIsProductModalOpen(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price.toString(),
            category: product.category,
            description: product.description || '',
            newCategory: ''
        });
        setIsProductModalOpen(true);
    };

    const validateAndPrepareSave = async () => {
        if (!user?.restaurantId || !formData.name || !formData.price || isSavingProduct) return;

        // Category Validation
        let finalCategory = formData.category;
        if (formData.category === 'new') {
            if (!formData.newCategory.trim()) {
                toast.warning("Escribe un nombre para la nueva categoría");
                return;
            }
            finalCategory = formData.newCategory.trim();
        }

        const dataToSave = {
            name: formData.name,
            price: Number(formData.price),
            category: finalCategory,
            description: formData.description
        };

        if (editingProduct) {
            // Confirm Edit
            setProductToSave({ id: editingProduct.id, data: dataToSave });
        } else {
            // Direct Add (Non-destructive usually doesnt need confirm, but let's just save)
            await executeSave(dataToSave);
        }
    };

    const executeSave = async (data: any, id?: string) => {
        setIsSavingProduct(true);
        try {
            if (id) {
                // UPDATE
                await updateDoc(doc(db, 'products', id), data);
                toast.success('Producto actualizado');
            } else {
                // ADD
                await addDoc(collection(db, 'products'), {
                    restaurantId: user?.restaurantId,
                    ...data,
                    active: true,
                    imageUrl: ''
                });
                toast.success('Producto agregado');
            }
            setIsProductModalOpen(false);
            setProductToSave(null);
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar producto");
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        try {
            await deleteDoc(doc(db, 'products', productToDelete.id));
            toast.success('Producto eliminado');
            setProductToDelete(null);
        } catch (e) {
            console.error(e);
            toast.error("Error al eliminar");
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando menú...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold text-white">Carta del Restaurante</h2>
                    <p className="text-sm text-slate-400">{products.length} platos registrados</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        Agregar Plato
                    </button>
                    <button
                        onClick={() => setIsScanModalOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg transition-all active:scale-95"
                    >
                        <Sparkles size={18} />
                        Importar con IA
                    </button>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No hay platos en el menú. ¡Agrega uno o usa la IA!
                    </div>
                )}
                {products.map(product => (
                    <div key={product.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-start hover:border-slate-600 transition-colors group">
                        <div className="flex-1">
                            <h4 className="font-bold text-slate-200 text-lg leading-tight">{product.name}</h4>
                            <p className="text-sm text-slate-500 mb-2 line-clamp-2 min-h-[2.5em]">{product.description || 'Sin descripción'}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded-full uppercase tracking-wider">{product.category}</span>
                                <span className="font-bold text-orange-400">S/ {product.price.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-2">
                            <button
                                onClick={() => handleOpenEdit(product)}
                                className="p-2 bg-slate-800 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 rounded-lg transition-colors border border-slate-700 hover:border-blue-500/50"
                                title="Editar"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(product)}
                                className="p-2 bg-slate-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-lg transition-colors border border-slate-700 hover:border-red-500/50"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ADD / EDIT PRODUCT MODAL */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {editingProduct ? <Edit size={20} className="text-blue-400" /> : <Plus size={20} className="text-blue-400" />}
                                {editingProduct ? 'Editar Plato' : 'Nuevo Plato'}
                            </h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X className="text-slate-400 hover:text-white" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre del Plato</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="Ej. Lomo Saltado"
                                    autoFocus
                                />
                            </div>

                            {/* Price & Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Precio (S/)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Categoría</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value, newCategory: '' })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="new" className="text-blue-400 font-bold">+ Nueva Categoría</option>
                                    </select>
                                </div>
                            </div>

                            {/* New Category Input (Conditional) */}
                            {formData.category === 'new' && (
                                <div className="bg-blue-900/10 p-3 rounded-lg border border-blue-500/20 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-blue-400 mb-1">Nombre de Nueva Categoría</label>
                                    <input
                                        type="text"
                                        value={formData.newCategory}
                                        onChange={e => setFormData({ ...formData, newCategory: e.target.value })}
                                        className="w-full bg-slate-900 border border-blue-500/50 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej. Postres"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <AlertCircle size={10} />
                                        Evita crear categorías vacías.
                                    </p>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Descripción (Opcional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-all h-20 resize-none"
                                    placeholder="Ingredientes, detalles..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                className="px-4 py-2 text-slate-300 hover:text-white transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={validateAndPrepareSave}
                                disabled={isSavingProduct}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSavingProduct ? 'Guardando...' : <><Save size={18} /> Guardar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM EDIT MODAL */}
            {productToSave && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2 border border-blue-500/20">
                                <Save size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Guardar Cambios?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Estás actualizando: <br />
                                    <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">{productToSave.data.name}</span>
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setProductToSave(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => executeSave(productToSave.data, productToSave.id)}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE MODAL */}
            {productToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 border border-red-500/20">
                                <AlertTriangle size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Plato?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Estás a punto de eliminar: <br />
                                    <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">{productToDelete.name}</span>
                                </p>
                                <p className="text-red-400 text-xs mt-2 font-medium">
                                    ⚠️ Esta acción no se puede deshacer.
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setProductToDelete(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SCAN MODAL (Keep Existing Logic) */}
            {isScanModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                                                        placeholder="Nombre del plato"
                                                    />
                                                    <input
                                                        value={item.description}
                                                        onChange={e => {
                                                            const newItems = [...scannedItems];
                                                            newItems[idx].description = e.target.value;
                                                            setScannedItems(newItems);
                                                        }}
                                                        className="bg-transparent text-xs text-slate-500 w-full outline-none mt-1"
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
                                                        placeholder="0.00"
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
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
