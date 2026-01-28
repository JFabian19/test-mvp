'use client';

import { Table } from '@/lib/types';
import { clsx } from 'clsx';
import { User, CheckCircle, Clock } from 'lucide-react';

interface TableGridProps {
    tables: Table[];
    onSelectTable: (table: Table) => void;
}

export function TableGrid({ tables, onSelectTable }: TableGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
            {tables.map((table) => {
                const isFree = table.status === 'free';
                const isOccupied = table.status === 'occupied';

                return (
                    <button
                        key={table.id}
                        onClick={() => onSelectTable(table)}
                        className={clsx(
                            "relative h-32 rounded-xl shadow-lg flex flex-col items-center justify-center border-2 transition-all active:scale-95",
                            isFree ? "bg-emerald-900/30 border-emerald-500/50 hover:bg-emerald-900/50" :
                                isOccupied ? "bg-red-900/30 border-red-500/50 hover:bg-red-900/50" :
                                    "bg-yellow-900/30 border-yellow-500/50 hover:bg-yellow-900/50" // paying
                        )}
                    >
                        <span className="text-2xl font-bold text-white mb-2">Mesa {table.number}</span>

                        <div className={clsx(
                            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                            isFree ? "text-emerald-400 bg-emerald-500/10" :
                                isOccupied ? "text-red-400 bg-red-500/10" :
                                    "text-yellow-400 bg-yellow-500/10"
                        )}>
                            {isFree ? <CheckCircle size={14} /> : <User size={14} />}
                            <span>{isFree ? "Libre" : isOccupied ? "Ocupada" : "Pagando"}</span>
                        </div>

                        {/* Optional: Show elapsed time or order count if occupied */}
                    </button>
                );
            })}
        </div>
    );
}
