'use client';

import { Order, OrderStatus } from '@/lib/types';
import { clsx } from 'clsx';
import { Clock, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface OrderCardProps {
    order: Order;
    onMarkReady: (orderId: string) => void;
}

export function OrderCard({ order, onMarkReady }: OrderCardProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const updateElapsed = () => {
            // Calculate elapsed minutes since createdAt
            // Ensure createdAt is a number (timestamp)
            const now = Date.now();
            const diff = now - order.createdAt;
            setElapsed(Math.floor(diff / 60000)); // Minutes
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [order.createdAt]);

    // Color Logic
    // 0-10: Green, 10-20: Yellow, 20+: Red Blinking
    let statusColor = "border-emerald-500 bg-emerald-900/10";
    let textColor = "text-emerald-500";
    let animate = "";

    if (elapsed >= 20) {
        statusColor = "border-red-600 bg-red-900/20";
        textColor = "text-red-500";
        animate = "animate-pulse"; // Blinking border effect
    } else if (elapsed >= 10) {
        statusColor = "border-yellow-500 bg-yellow-900/10";
        textColor = "text-yellow-500";
    }

    return (
        <div
            className={clsx(
                "rounded-xl border-l-4 shadow-lg bg-slate-800 p-4 flex flex-col justify-between min-h-[250px] transition-all",
                statusColor,
                animate
            )}
        >
            <div>
                <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white">Mesa {order.tableNumber}</h3>
                        <span className="text-xs text-slate-400">Order #{order.id.slice(-4)}</span>
                    </div>
                    <div className={clsx("flex items-center gap-1 font-bold", textColor)}>
                        <Clock size={16} />
                        <span>{elapsed}m</span>
                    </div>
                </div>

                <ul className="space-y-2 mt-2">
                    {order.items.map((item, idx) => (
                        <li key={idx} className="text-slate-200">
                            <div className="flex justify-between">
                                <span className="font-bold mr-2">{item.quantity}x</span>
                                <span className="flex-1">{item.name}</span>
                            </div>
                            {item.note && (
                                <p className="text-xs text-orange-400 italic ml-6">Note: {item.note}</p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <button
                onClick={() => onMarkReady(order.id)}
                className="mt-4 w-full py-3 bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold"
            >
                <CheckCircle size={20} />
                Marcar Listo
            </button>
        </div>
    );
}
