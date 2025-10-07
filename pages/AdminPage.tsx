import React, { useState, useEffect } from 'react';
import api from '../services/localStorageManager';
import { AppUser, AppRole } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';

type AdminTab = 'users' | 'roles' | 'maintenance' | 'activity_log';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    const TabButton: React.FC<{ tab: AdminTab; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground">Administración del Sistema</h2>
            </div>
            <div className="border-b border-border px-6">
                <nav className="flex space-x-4 -mb-px">
                    <TabButton tab="users" label="Gestionar Usuarios" />
                    <TabButton tab="roles" label="Gestionar Roles" />
                    <TabButton tab="maintenance" label="Mantenimiento" />
                    <TabButton tab="activity_log" label="Registro de Actividad" />
                </nav>
            </div>
            <div className="p-6">
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'roles' && <RoleManagement />}
                {activeTab === 'maintenance' && <p className="text-muted-foreground">Página de Mantenimiento en construcción.</p>}
                {activeTab === 'activity_log' && <p className="text-muted-foreground">Página de Registro de Actividad en construcción.</p>}
            </div>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const usersData = await api.getCollection<AppUser>("users");
                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching users: ", error);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" />
                    Invitar Usuario
                </button>
            </div>
            <div className="bg-muted/50 rounded-lg">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-3">Correo Electrónico</th>
                            <th scope="col" className="px-6 py-3">Rol</th>
                            <th scope="col" className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan={3} className="text-center py-10">Cargando usuarios...</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className="border-b border-border bg-card hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium text-foreground">{user.email}</td>
                                <td className="px-6 py-4">{user.role}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <button className="text-yellow-500 hover:text-yellow-700">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button className="text-red-500 hover:text-red-700">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const rolesData = await api.getCollection<AppRole>("roles");
                setRoles(rolesData);
            } catch (error) {
                console.error("Error fetching roles: ", error);
            }
            setLoading(false);
        };
        fetchRoles();
    }, []);


    return (
    <div>
        <div className="flex justify-end mb-4">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                <PlusIcon className="w-4 h-4" />
                Crear Rol
            </button>
        </div>
        <div className="bg-muted/50 rounded-lg">
            <table className="w-full text-sm text-left text-muted-foreground">
                <thead className="text-xs uppercase">
                    <tr>
                        <th scope="col" className="px-6 py-3">Nombre del Rol</th>
                        <th scope="col" className="px-6 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                     {loading ? (
                        <tr><td colSpan={2} className="text-center py-10">Cargando roles...</td></tr>
                     ) : roles.map((role) => (
                        <tr key={role.id} className="border-b border-border bg-card hover:bg-muted/50">
                            <td className="px-6 py-4 font-medium text-foreground">
                                {role.name} {role.isDefault && <span className="text-xs text-muted-foreground">(Default)</span>}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <button className="text-yellow-500 hover:text-yellow-700">
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button className="text-red-500 hover:text-red-700" disabled={role.isDefault}>
                                        <TrashIcon className={`w-4 h-4 ${role.isDefault ? 'text-gray-400 cursor-not-allowed' : ''}`} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
};


export default AdminPage;
