'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { UtensilsCrossed, ChefHat, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Auto-append domain if simple username provided
            const emailToUse = email.includes('@') ? email : `${email}@restaurante.app`;

            const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
            const user = userCredential.user;

            // Fetch user role
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;

                if (role === 'owner' || role === 'admin') {
                    router.push('/admin');
                } else if (role === 'kitchen') {
                    router.push('/kitchen');
                } else {
                    router.push('/waiter');
                }
            } else {
                setError('Usuario no encontrado. Contacta a soporte.');
                await auth.signOut();
            }

        } catch (err: any) {
            console.error(err);
            setError('Credenciales incorrectas. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-4 relative overflow-hidden">

            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 relative z-10 animate-in fade-in zoom-in-95 duration-500">

                {/* Brand Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4 transform rotate-3">
                        <UtensilsCrossed size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white mb-1">
                        Resto<span className="text-orange-500">Fast</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">Gestión inteligente para restaurantes</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 animate-in shake">
                        <span>⚠️</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Usuario</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario o correo@ejemplo.com"
                            className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-600 text-slate-200"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder:text-slate-600 text-slate-200"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Ingresando...
                            </>
                        ) : (
                            <>
                                Iniciar Sesión <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        &copy; {new Date().getFullYear()} RestoFast Inc.
                    </p>
                </div>
            </div>
        </div>
    );
}
