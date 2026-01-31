import { useState } from 'react';
import { Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TableSetupProps {
    currentCount: number;
    onSave: (count: number) => Promise<void>;
    onCancel: () => void;
}

export function TableSetup({ currentCount, onSave, onCancel }: TableSetupProps) {
    const [count, setCount] = useState(currentCount || 10);
    const [loading, setLoading] = useState(false);
    const [showConfirmReduce, setShowConfirmReduce] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (count < currentCount) {
            setShowConfirmReduce(true);
            return;
        }

        await executeSave();
    };

    const executeSave = async () => {
        setLoading(true);
        try {
            await onSave(count);
            // Success handled by parent or toast here? Parent closes us.
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar las mesas');
        } finally {
            setLoading(false);
            setShowConfirmReduce(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md mx-auto relative">
            <h3 className="text-xl font-bold text-white mb-4">Configuración de Mesas</h3>
            <p className="text-slate-400 text-sm mb-6">
                Define la cantidad de mesas disponibles en tu restaurante.
                Si reduces la cantidad, las mesas con número mayor serán eliminadas.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Cantidad de Mesas
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
                    >
                        <X size={18} />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition flex items-center justify-center gap-2"
                    >
                        {loading ? 'Guardando...' : (
                            <>
                                <Save size={18} />
                                Guardar
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Confirmation Modal for Reducing Tables */}
            {showConfirmReduce && (
                <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-3 border border-red-500/20">
                        <AlertTriangle size={24} />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">¿Reducir cantidad de mesas?</h4>
                    <p className="text-sm text-slate-400 mb-4">
                        Estás reduciendo de <span className="text-white font-bold">{currentCount}</span> a <span className="text-white font-bold">{count}</span> mesas.
                        <br />
                        Las mesas superiores a {count} serán <span className="text-red-400">eliminadas permanentemente</span>.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setShowConfirmReduce(false)}
                            className="flex-1 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={executeSave}
                            disabled={loading}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 shadow-lg shadow-red-900/20"
                        >
                            {loading ? 'Confirmando...' : 'Sí, Eliminar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
