'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, DollarSign, TrendingUp, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Firestore Imports
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Order } from '@/lib/types';


export function SalesReports() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | '15days' | 'custom'>('week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Fetch Orders from Firestore
    useEffect(() => {
        if (!user?.restaurantId) return;

        const fetchOrders = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'orders'), where('restaurantId', '==', user.restaurantId));
                const snapshot = await getDocs(q);
                const fetchedOrders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Order[];

                setOrders(fetchedOrders);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user?.restaurantId]);



    // ... start of helper vars ...
    // Filter Data based on Range
    const filteredData = useMemo(() => {
        const now = new Date();
        // ... (rest of filtering logic)
        let start = startOfDay(now);
        let end = endOfDay(now);

        switch (dateRange) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'week':
                start = subDays(now, 7);
                break;
            case '15days':
                start = subDays(now, 15);
                break;
            case 'month':
                start = subDays(now, 30);
                break;
            case 'custom':
                if (customStart && customEnd) {
                    start = startOfDay(parseISO(customStart));
                    end = endOfDay(parseISO(customEnd));
                }
                break;
        }

        return orders.filter((order) => {
            // Order.createdAt is a number (timestamp)
            const orderDate = new Date(order.createdAt);
            return isWithinInterval(orderDate, { start, end });
        });
    }, [dateRange, customStart, customEnd, orders]);

    // Aggregate Data for Charts
    const chartData = useMemo(() => {
        const groupedByDay: { [key: string]: number } = {};

        filteredData.forEach(order => {
            const date = new Date(order.createdAt);
            const dayKey = format(date, 'dd/MM/yyyy');
            groupedByDay[dayKey] = (groupedByDay[dayKey] || 0) + order.total;
        });

        // Ensure we sort by date
        return Object.entries(groupedByDay)
            .map(([date, amount]) => ({
                date,
                timestamp: parseISO(date.split('/').reverse().join('-')).getTime(), // Helper for sorting NOT accurate for 'dd/MM/yyyy' parsing directly if not careful, but works if we flip
                ventas: amount
            }))
            .sort((a, b) => {
                // Manual parse for dd/MM/yyyy sorting
                const [dA, mA, yA] = a.date.split('/');
                const [dB, mB, yB] = b.date.split('/');
                return new Date(Number(yA), Number(mA) - 1, Number(dA)).getTime() - new Date(Number(yB), Number(mB) - 1, Number(dB)).getTime();
            });
    }, [filteredData]);

    // Aggregate Top Products
    const topProducts = useMemo(() => {
        const productStats: { [key: string]: number } = {};

        filteredData.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    productStats[item.name] = (productStats[item.name] || 0) + item.quantity;
                });
            }
        });

        return Object.entries(productStats)
            .map(([name, quantity]) => ({ name, cantidad: quantity }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5); // Top 5
    }, [filteredData]);

    const totalSales = filteredData.reduce((acc, curr) => acc + curr.total, 0);
    const averageTicket = filteredData.length > 0 ? totalSales / filteredData.length : 0;

    if (loading) return <div className="p-10 text-center text-slate-400">Cargando datos...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Reporte de Ventas
                    </h2>
                    <p className="text-slate-400 text-sm">Resumen financiero y métricas clave</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">


                    {[
                        { id: 'today', label: 'Hoy' },
                        { id: 'week', label: '7 Días' },
                        { id: '15days', label: '15 Días' },
                        { id: 'month', label: 'Mes' },
                        { id: 'custom', label: 'Personalizado' },
                    ].map((range) => (
                        <button
                            key={range.id}
                            onClick={() => setDateRange(range.id as any)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${dateRange === range.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {dateRange === 'custom' && (
                <div className="flex gap-4 p-4 bg-slate-900 rounded-lg border border-slate-800">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Desde</label>
                        <input
                            type="date"
                            className="bg-slate-800 border-slate-700 rounded text-sm px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Hasta</label>
                        <input
                            type="date"
                            className="bg-slate-800 border-slate-700 rounded text-sm px-2 py-1 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    title="Ventas Totales"
                    value={`S/ ${totalSales.toFixed(2)}`}
                    icon={<DollarSign className="text-green-400" />}
                    trend="+12%"
                    trendUp={true}
                />
                <Card
                    title="Pedidos Totales"
                    value={filteredData.length.toString()}
                    icon={<ShoppingBag className="text-blue-400" />}
                    trend="+5%"
                    trendUp={true}
                />
                <Card
                    title="Ticket Promedio"
                    value={`S/ ${averageTicket.toFixed(2)}`}
                    icon={<TrendingUp className="text-purple-400" />}
                    trend="-2%"
                    trendUp={false}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Sales Chart */}
                <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-500" />
                        Tendencia de Ventas
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `S/${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                    formatter={(value: any) => [`S/ ${value}`, 'Ventas']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ventas"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorVentas)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products Chart */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-6 text-white">Platos Más Vendidos</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    interval={0}
                                />
                                <Tooltip
                                    cursor={{ fill: '#1e293b' }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                                />
                                <Bar dataKey="cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function Card({ title, value, icon, trend, trendUp }: any) {
    return (
        <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-800 rounded-lg text-white group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend}
                    </div>
                )}
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
}
