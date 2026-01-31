'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurant } from '@/hooks/useRestaurant';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Role } from '@/lib/types';
import { createStaffUser } from '@/lib/authHelpers';
import { Users, UserPlus, X, Check, ChefHat, Utensils, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function StaffManager() {
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const [staff, setStaff] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newName, setNewName] = useState('');
    const [newEmailPrefix, setNewEmailPrefix] = useState(''); // Acts as "Username Suffix" here
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<Role>('waiter');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    useEffect(() => {
        if (!user?.restaurantId) return;

        const q = query(
            collection(db, 'users'),
            where('restaurantId', '==', user.restaurantId)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => doc.data() as User);
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
            // Generate Username: [RestaurantPrefix]-[Input]
            // e.g. "Rossana Chifa" -> "rossana" + "-" + "juan" = "rossana-juan"
            const prefix = restaurant.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const usernameSuffix = newEmailPrefix.toLowerCase().replace(/[^a-z0-9]/g, ''); // Ensure clean suffix

            if (!usernameSuffix) {
                setError('Por favor escribe un usuario válido.');
                setCreating(false);
                return;
            }

            const fullUsername = `${prefix}-${usernameSuffix}`;

            // Internal Email for Auth (Hidden from user)
            const email = `${fullUsername}@restaurante.app`;

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

            // Success Toast
            toast.success('Usuario creado exitosamente', {
                description: `USUARIO: ${fullUsername} | CLAVE: ${newPassword}`,
                duration: 15000, // Long duration so they can read/copy
                action: {
                    label: 'Copiar',
                    onClick: () => {
                        navigator.clipboard.writeText(`Usuario: ${fullUsername}\nClave: ${newPassword}`);
                        toast.success('Copiado al portapapeles');
                    }
                }
            });

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('El usuario ya existe (Intenta con otro nombre).');
                toast.error('El usuario ya existe');
            } else {
                setError('Error al crear usuario: ' + err.message);
                toast.error('Error al crear usuario');
            }
        } finally {
            setCreating(false);
        }
    };

    // Trigger delete confirmation modal
    const handleDeleteClick = (staffMember: User) => {
        if (!user) return;
        if (staffMember.uid === user.uid) {
            toast.warning("No puedes eliminar tu propia cuenta.");
            return;
        }
        setUserToDelete(staffMember);
    };

    // Perform actual deletion
    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await deleteDoc(doc(db, 'users', userToDelete.uid));
            toast.success(`Usuario ${userToDelete.displayName} eliminado`);
            setUserToDelete(null);
        } catch (e) {
            console.error(e);
            toast.error("Error al eliminar usuario.");
        }
    };

    // Helper to display clean username
    const getDisplayUsername = (email: string) => {
        if (email.endsWith('@restaurante.app')) {
            return email.split('@')[0];
        }
        return email; // Fallback for admin emails or legacy
    };

    if (loading) return <div className="p-4 text-slate-400">Cargando personal...</div>;

    const restPrefix = restaurant?.name ? restaurant.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : '...';

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="text-blue-500" />
                    Equipo de Trabajo
                </h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg"
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
                            <div key={member.uid} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${member.role === 'waiter' ? 'bg-orange-900/20' : member.role === 'kitchen' ? 'bg-red-900/20' : 'bg-blue-900/20'}`}>
                                        {member.role === 'waiter' && <Utensils size={18} className="text-orange-500" />}
                                        {member.role === 'kitchen' && <ChefHat size={18} className="text-red-500" />}
                                        {(member.role === 'admin' || member.role === 'owner') && <Users size={18} className="text-blue-500" />}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-slate-200 truncate">{member.displayName}</p>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <p className="text-xs text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 truncate w-fit">
                                                User: {getDisplayUsername(member.email || '')}
                                            </p>
                                            {member.visiblePassword && (
                                                <div className="flex items-center gap-2 group/pass cursor-pointer" onClick={() => toast.info(`Clave: ${member.visiblePassword}`, { description: 'Recuerda que si el usuario la cambió, esta referencia puede ser antigua.' })}>
                                                    <p className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-800/50 truncate w-fit flex items-center gap-1 hover:text-white transition-colors">
                                                        Pass: •••••• <Eye size={10} />
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 pl-2">
                                    {/* Role Badge */}
                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap
                                        ${member.role === 'waiter' ? 'bg-orange-500/10 text-orange-400' :
                                            member.role === 'kitchen' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {member.role === 'waiter' ? 'MESERO' :
                                            member.role === 'kitchen' ? 'COCINA' :
                                                member.role === 'owner' ? 'DUEÑO' : 'ADMIN'}
                                    </div>

                                    {/* Delete Button (Only for others) */}
                                    {member.uid !== user?.uid && (
                                        <button
                                            onClick={() => handleDeleteClick(member)}
                                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Eliminar acceso"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-visible animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-xl font-bold text-white">Nuevo Integrante</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-white" /></button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleCreateStaff} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Rol</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewRole('waiter')}
                                            className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${newRole === 'waiter' ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            <Utensils size={18} /> Mesero
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewRole('kitchen')}
                                            className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${newRole === 'kitchen' ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            <ChefHat size={18} /> Cocina
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Usuario para Login</label>
                                        <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden group-focus-within:border-blue-500 transition-colors">
                                            <span className="bg-slate-800 text-slate-400 px-2 py-2 text-sm select-none border-r border-slate-700 font-mono">
                                                {restPrefix}-
                                            </span>
                                            <input
                                                type="text"
                                                required
                                                placeholder="mesero1"
                                                value={newEmailPrefix}
                                                onChange={e => setNewEmailPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                                className="w-full bg-transparent px-2 py-2 text-white outline-none text-sm font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-blue-400 mt-1 truncate">
                                            Login: <span className="text-white font-mono">{restPrefix}-{newEmailPrefix || '...'}</span>
                                        </p>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Contraseña</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={6}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                                            placeholder="******"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded border border-red-400/20">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50 flex justify-center items-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    {creating ? 'Creando...' : <><Check size={20} /> Crear Usuario</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 border border-red-500/20">
                                <AlertTriangle size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Usuario?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Estás a punto de eliminar el acceso de <br />
                                    <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">{userToDelete.displayName}</span>
                                </p>
                                <p className="text-red-400 text-xs mt-2 font-medium">
                                    ⚠️ Esta acción no se puede deshacer.
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-4">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-medium transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]"
                                >
                                    Sí, Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
