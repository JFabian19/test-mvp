'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Optional: Redirect if already logged in (can be handled by middleware too)
    // const { user } = useAuth();
    // if (user) ...

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Auth state listener in useAuth will handle fetching role and redirects ideally,
            // but we can also force a refresh or quick redirect here if we knew the role.
            // For now, let's just push to a default or wait for the user state to update.
            // A simple strategy:
            router.push('/waiter'); // Default landing, will accept for now. 
            // Better: check role after sign in.
        } catch (err: any) {
            console.error(err);
            setError('Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl shadow-xl border border-slate-800">
                <h1 className="text-3xl font-bold mb-6 text-center text-orange-500">Restaurante MVP</h1>
                <h2 className="text-xl font-semibold mb-6 text-center text-slate-300">Iniciar Sesión</h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-400">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : 'Ingresar'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-600">
                    <p>Demo Credentials (if set up):</p>
                    <p>waiter@demo.com / 123456</p>
                </div>
            </div>
        </div>
    );
}
