'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Receipt } from '@/lib/types';
import { FileText, Search, Calendar, Eye, X } from 'lucide-react';
import { format } from 'date-fns';

export function SalesHistory() {
    const { user } = useAuth();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

    useEffect(() => {
        if (!user?.restaurantId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'receipts'),
            where('restaurantId', '==', user.restaurantId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
            // Client-side sort desc
            fetched.sort((a, b) => b.closedAt - a.closedAt);
            setReceipts(fetched);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching receipts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.restaurantId]);

    const filteredReceipts = receipts.filter(r => {
        const matchesSearch =
            r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.closedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.tableNumber.toLowerCase().includes(searchTerm.toLowerCase());

        const rDate = new Date(r.closedAt);
        // Format to YYYY-MM-DD local time for comparison
        const rDateString = rDate.toISOString().split('T')[0]; // This is UTC, might need local adjustment if critical, but standard HTML date input uses YYYY-MM-DD.
        // Better approach for local comparison:
        const localDateString = rDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

        const matchesDate = filterDate ? localDateString === filterDate : true;

        return matchesSearch && matchesDate;
    });

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando historial...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-blue-400" />
                        Historial de Boletas
                    </h2>
                    <p className="text-sm text-slate-400">{filteredReceipts.length} encontrados de {receipts.length} total</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar código, mozo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500 w-48 lg:w-64 text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500 text-sm [color-scheme:dark]"
                        />
                    </div>
                    {filterDate && (
                        <button
                            onClick={() => setFilterDate('')}
                            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700"
                            title="Limpiar fecha"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                                <th className="p-4 font-bold">Código</th>
                                <th className="p-4 font-bold">Fecha / Hora</th>
                                <th className="p-4 font-bold">Mesa</th>
                                <th className="p-4 font-bold">Total</th>
                                <th className="p-4 font-bold">Método</th>
                                <th className="p-4 font-bold">Registrado por</th>
                                <th className="p-4 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        No se encontraron boletas con estos filtros.
                                    </td>
                                </tr>
                            ) : (
                                filteredReceipts.map((receipt) => (
                                    <tr key={receipt.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono font-bold text-blue-400 bg-blue-900/20 px-2 py-1 rounded text-xs border border-blue-500/20">
                                                {receipt.code}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-300 text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">
                                                    {new Date(receipt.closedAt).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(receipt.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="w-8 h-8 rounded bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-700 shadow-sm mx-auto">
                                                {receipt.tableNumber}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-emerald-400 font-bold">
                                                S/ {receipt.total.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                                                {receipt.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                                                    {receipt.closedBy.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-200">{receipt.closedBy.name}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase">{receipt.closedBy.role === 'owner' ? 'Admin' : receipt.closedBy.role}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => setSelectedReceipt(receipt)}
                                                className="p-2 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 rounded-lg transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Detail Modal */}
            {selectedReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-bold text-white">Boleta: {selectedReceipt.code}</h3>
                                <p className="text-xs text-slate-400">
                                    {new Date(selectedReceipt.closedAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold">Mesa</p>
                                    <p className="text-lg font-bold text-white">{selectedReceipt.tableNumber}</p>
                                </div>
                                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold">Mozo / Cajero</p>
                                    <p className="text-sm font-bold text-white truncate">{selectedReceipt.closedBy.name}</p>
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-800 pb-1">Detalle de Consumo</h4>
                                <div className="space-y-3">
                                    {selectedReceipt.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-start text-sm">
                                            <div>
                                                <span className="text-slate-200 font-medium">{item.quantity}x {item.name}</span>
                                                {item.note && <p className="text-slate-500 text-xs italic">Nota: {item.note}</p>}
                                            </div>
                                            <span className="text-slate-300 font-mono">
                                                {/* Calculate total per item line if available, else just unit * qty */}
                                                S/ {(item.price * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-800 pt-4 mt-2 space-y-1">
                                <div className="flex justify-between items-center text-slate-400 text-sm">
                                    <span>Subtotal</span>
                                    <span>S/ {selectedReceipt.total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-white text-lg font-bold">
                                    <span>Total Pagado</span>
                                    <span className="text-emerald-400">S/ {selectedReceipt.total.toFixed(2)}</span>
                                </div>
                                <div className="text-right pt-2">
                                    <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300">
                                        Pagado con: {selectedReceipt.paymentMethod}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950/30 border-t border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500">ID Único: {selectedReceipt.id}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
