'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Role } from '@/lib/types';
import { createStaffUser } from '@/lib/authHelpers';
import { Users, UserPlus, X, Check, ChefHat, Utensils } from 'lucide-react';

export function StaffManager() {
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const [staff, setStaff] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newName, setNewName] = useState('');
    const [newEmailPrefix, setNewEmailPrefix] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<Role>('waiter');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.restaurantId) return;

        const q = query(
            collection(db, 'users'),
            where('restaurantId', '==', user.restaurantId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => doc.data() as User);
            // Filter out the owner/self if desired, or show everyone
            setStaff(fetched);
            setLoading(false);
        });

        return () => unsub();
    }, [user?.restaurantId]);

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setCreating(true);
        setError('');

        try {
            // Generate a "unique-ish" email for login simplicity
            // Format: [prefix]@[restaurantId].internal
            // We strip spaces and special chars from restaurantId or just use ID
            const cleanRestId = restaurant.id.replace(/[^a-zA-Z0-9]/g, '');
            const email = `${newEmailPrefix}@${cleanRestId}.internal`;

            await createStaffUser(
                restaurant.id,
                email,
                newPassword,
                newName,
                newRole
            );

            setIsModalOpen(false);
            setNewName('');
            setNewEmailPrefix('');
            setNewPassword('');
            alert(`Usuario creado: ${email}`);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('El usuario ya existe (Email duplicado).');
            } else {
                setError('Error al crear usuario: ' + err.message);
            }
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="p-4 text-slate-400">Cargando personal...</div>;

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="text-blue-500" />
                    Equipo de Trabajo
                </h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                    <UserPlus size={16} />
                    Agregar Personal
                </button>
            </div>

            <div className="p-6">
                {staff.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No hay personal registrado.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {staff.map((member) => (
                            <div key={member.uid} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-slate-200">{member.displayName}</p>
                                    <p className="text-xs text-slate-500">{member.email}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold uppercase
                                    ${member.role === 'waiter' ? 'bg-orange-500/20 text-orange-400' :
                                        member.role === 'kitchen' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {member.role === 'waiter' && <Utensils size={14} className="inline mr-1" />}
                                    {member.role === 'kitchen' && <ChefHat size={14} className="inline mr-1" />}
                                    {member.role}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nuevo Integrante</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStaff} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Rol</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewRole('waiter')}
                                        className={`p-2 rounded border text-sm font-semibold flex items-center justify-center gap-2 ${newRole === 'waiter' ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <Utensils size={16} /> Mesero
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRole('kitchen')}
                                        className={`p-2 rounded border text-sm font-semibold flex items-center justify-center gap-2 ${newRole === 'kitchen' ? 'bg-red-600 border-red-600 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <ChefHat size={16} /> Cocina
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Usuario (Login)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="juan"
                                        value={newEmailPrefix}
                                        onChange={e => setNewEmailPrefix(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Será: {newEmailPrefix || 'user'}@{restaurant?.id.replace(/[^a-zA-Z0-9]/g, '') || '...'}...</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Contraseña</label>
                                    <input
                                        type="text"
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded border border-red-400/20">{error}</p>}

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {creating ? 'Creando...' : <><Check size={20} /> Crear Usuario</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
