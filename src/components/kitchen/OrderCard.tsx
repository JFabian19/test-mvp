'use client';

import { Order, OrderItem, ItemStatus } from '@/lib/types';
import { clsx } from 'clsx';
import { Clock, CheckCircle, ChefHat, Utensils, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

interface OrderCardProps {
    order: Order;
    onUpdateItemStatus?: (orderId: string, itemId: string, newStatus: ItemStatus) => void;
    onMarkAllReady?: (orderId: string) => void;
}

const statusConfig: Record<ItemStatus, { color: string, icon: any, label: string, next: ItemStatus | null }> = {
    pending: { color: 'text-slate-400', icon: Clock, label: 'En espera', next: 'cooking' },
    cooking: { color: 'text-orange-400', icon: ChefHat, label: 'Cocinando', next: 'ready' },
    ready: { color: 'text-emerald-400', icon: Bell, label: 'Listo', next: 'delivered' }, // Waiter handles delivered
    delivered: { color: 'text-blue-400', icon: CheckCircle, label: 'Entregado', next: null }
};

export function OrderCard({ order, onUpdateItemStatus, onMarkAllReady }: OrderCardProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const updateElapsed = () => {
            const now = Date.now();
            const diff = now - order.createdAt;
            setElapsed(Math.floor(diff / 60000));
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 60000);
        return () => clearInterval(interval);
    }, [order.createdAt]);

    // Card border color based on worst item status or time?
    // User asked for "Pending -> Color, Cooking -> Color".
    // Let's use time for urgency, but maybe background/border for overall state.

    const allReady = order.items.every(i => i.status === 'ready' || i.status === 'delivered');
    const hasCooking = order.items.some(i => i.status === 'cooking');
    const isLate = elapsed > 20;

    const cardBorderCheck = isLate ? "border-red-500 animate-pulse" :
        allReady ? "border-emerald-500" :
            hasCooking ? "border-orange-500" : "border-slate-600";

    return (
        <div className={clsx(
            "rounded-xl border-l-4 shadow-lg bg-slate-800 p-4 flex flex-col justify-between min-h-[250px] transition-all",
            cardBorderCheck
        )}>
            <div>
                <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white">Mesa {order.tableNumber}</h3>
                        <span className="text-xs text-slate-400">#{order.id.slice(-4)}</span>
                    </div>
                    <div className={clsx("flex items-center gap-1 font-bold", isLate ? "text-red-500" : "text-slate-400")}>
                        <Clock size={16} />
                        <span>{elapsed}m</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Separate Items: Kitchen (Cookable) vs Bar (Drinks) */}
                    {(() => {
                        const allItems = order.items;
                        const kitchenItems = allItems.filter(i => i.category !== 'Bebidas');
                        const barItems = allItems.filter(i => i.category === 'Bebidas');

                        return (
                            <>
                                {/* 1. Kitchen Items (Interactive) */}
                                {kitchenItems.length > 0 ? (
                                    kitchenItems.map((item, idx) => {
                                        // Fallback for old data without status/id
                                        const status = item.status || 'pending';
                                        const config = statusConfig[status];
                                        const itemId = item.id || `temp-${idx}`; // Fallback ID

                                        return (
                                            <div key={itemId} className="flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white text-lg">{item.quantity}x</span>
                                                            <span className="text-slate-200 font-medium leading-tight">{item.name}</span>
                                                        </div>
                                                        {item.note && (
                                                            <p className="text-xs text-orange-300 italic mt-1">📝 {item.note}</p>
                                                        )}
                                                    </div>

                                                    {/* Item Status Button */}
                                                    {status !== 'delivered' && config.next && status !== 'ready' && onUpdateItemStatus && (
                                                        <button
                                                            onClick={() => onUpdateItemStatus(order.id, itemId, config.next!)}
                                                            className={clsx(
                                                                "p-2 rounded-lg transition-all flex flex-col items-center gap-1 min-w-[70px] shadow-sm flex-shrink-0",
                                                                status === 'pending' ? "bg-slate-700 text-slate-300 hover:bg-orange-600 hover:text-white border border-slate-600" :
                                                                    status === 'cooking' ? "bg-orange-900/40 text-orange-200 hover:bg-emerald-600 hover:text-white border border-orange-500/30" :
                                                                        "bg-emerald-900/20 text-emerald-400"
                                                            )}
                                                            title={`Cambiar a ${statusConfig[config.next!].label}`}
                                                        >
                                                            {/* Show NEXT status icon/label */}
                                                            {(() => {
                                                                const nextState = statusConfig[config.next!];
                                                                return (
                                                                    <>
                                                                        <nextState.icon size={18} />
                                                                        <span className="text-[9px] uppercase font-bold">{nextState.label}</span>
                                                                    </>
                                                                );
                                                            })()}
                                                        </button>
                                                    )}
                                                    {status === 'ready' && (
                                                        <div className="p-2 text-emerald-400 flex flex-col items-center min-w-[70px] bg-emerald-900/20 rounded-lg border border-emerald-500/30 flex-shrink-0">
                                                            <Bell size={18} className="animate-bounce" />
                                                            <span className="text-[9px] font-bold uppercase">Listo</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-4 text-slate-500 text-sm italic border-2 border-dashed border-slate-800 rounded-lg">
                                        Solo Bebidas
                                    </div>
                                )}

                                {/* 2. Bar Items (Passive / Separator) */}
                                {barItems.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-700">
                                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span>🥤</span> Bebidas (Bar)
                                        </h4>
                                        <div className="space-y-1 opacity-75">
                                            {barItems.map((item, idx) => (
                                                <div key={item.id || idx} className="flex items-center justify-between text-sm bg-blue-900/10 p-1.5 rounded border border-blue-500/10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-blue-500/20 text-blue-300 px-1.5 rounded text-xs font-bold">{item.quantity}x</span>
                                                        <span className="text-slate-400">{item.name}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Global Actions */}
            {onMarkAllReady && !allReady && (
                <button
                    onClick={() => onMarkAllReady(order.id)}
                    className="mt-4 w-full py-3 bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm"
                >
                    <CheckCircle size={18} />
                    Marcar Todos Listos
                </button>
            )}
        </div>
    );
}
