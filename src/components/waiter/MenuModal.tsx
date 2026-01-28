'use client';

import { useState } from 'react';
import { Product, Category } from '@/lib/types';
import { X, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '@/store/useStore';

interface MenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    currentTableId: string | null;
}

const CATEGORIES: Category[] = ['Entradas', 'Fondos', 'Bebidas', 'Postres', 'Otros'];

export function MenuModal({ isOpen, onClose, products, currentTableId }: MenuModalProps) {
    const [activeCategory, setActiveCategory] = useState<Category>('Fondos');
    const { addToCart, toggleCart } = useStore();

    if (!isOpen) return null;

    const filteredProducts = products.filter(p => p.category === activeCategory);

    const handleAdd = (product: Product) => {
        addToCart(product);
        // Optional: Visual feedback or auto-open cart?
        // toggleCart(); 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col overflow-hidden border border-slate-700 shadow-2xl">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl font-bold text-white">Carta</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Categories (Horizontal Scroll) */}
                <div className="flex gap-2 p-4 overflow-x-auto bg-slate-900 border-b border-slate-800 no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={clsx(
                                "px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                                activeCategory === cat
                                    ? "bg-orange-600 text-white shadow-lg shadow-orange-900/50"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => handleAdd(product)}
                            className="bg-slate-800 p-4 rounded-xl border border-slate-700 active:scale-95 transition-transform flex flex-col justify-between h-40 relative group cursor-pointer hover:border-orange-500/50"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-200 leading-tight pr-6">{product.name}</h3>
                                </div>
                                {product.description && (
                                    <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                                )}
                            </div>

                            <div className="flex justify-between items-end mt-2">
                                <span className="text-lg font-bold text-orange-400">S/ {product.price.toFixed(2)}</span>
                                <div className="bg-orange-600/20 text-orange-500 p-2 rounded-full">
                                    <Plus size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                    <button
                        onClick={toggleCart} // Open cart to confirm
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
                    >
                        Ver Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}
