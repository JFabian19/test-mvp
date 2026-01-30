import { useState } from 'react';
import { Save, X } from 'lucide-react';

interface TableSetupProps {
    currentCount: number;
    onSave: (count: number) => Promise<void>;
    onCancel: () => void;
}

export function TableSetup({ currentCount, onSave, onCancel }: TableSetupProps) {
    const [count, setCount] = useState(currentCount || 10);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(count);
        } catch (error) {
            console.error(error);
            alert('Error al guardar las mesas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md mx-auto">
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
        </div>
    );
}
