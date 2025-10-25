

import React, { useState, useEffect } from 'react';
import api from '../services/localStorageManager';
import { AppUser, AppRole, PagePermissions, AppUserRole } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';
import { useAuth } from '../contexts/AuthContext';
import CoffeeTypesPage from '../components/CoffeeTypesPage';
import ByproductTypesPage from '../components/ByproductTypesPage';
import LogsTab from '../components/LogsTab';
import { useToast } from '../hooks/useToast';
import NotificationsTab from '../components/NotificationsTab';

type AdminTab = 'users' | 'roles' | 'coffeeTypes' | 'byproducts' | 'logs' | 'notifications';

const manageablePages = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'contracts-info', name: 'Exportaciones (Info. Contrato)' },
    { id: 'contracts-lots', name: 'Exportaciones (Partidas)' },
    { id: 'contracts-threshing', name: 'Exportaciones (Órdenes de Trilla)' },
    { id: 'ventasLocales', name: 'Ventas Locales' },
    { id: 'ingreso', name: 'Ingreso de Café' },
    { id: 'rendimientos', name: 'Rendimientos' },
    { id: 'reprocesos', name: 'Reprocesos' },
    { id: 'mezclas', name: 'Mezclas' },
    { id: 'salidas', name: 'Salidas' },
    { id: 'trazabilidad', name: 'Trazabilidad' },
    { id: 'entities', name: 'Entidades' },
    { id: 'admin', name: 'Administración' },
    { id: 'coffeeTypes', name: 'Tipos de Café' },
    { id: 'byproducts', name: 'Tipos de Sub Productos' },
    { id: 'logs', name: 'Bitácora de Actividad' },
];

const defaultPermissions: PagePermissions = { view: false, add: false, edit: false, delete: false, viewCosts: false, viewAnalysis: false, viewPrices: false, editEntrada: false, editSalida: false, canFinalize: false };

const getDefaultRolePermissions = (): { [key: string]: PagePermissions } => {
    return manageablePages.reduce((acc, page) => {
        acc[page.id] = { ...defaultPermissions };
        return acc;
    }, {} as { [key: string]: PagePermissions });
};

// --- MODAL & EDITOR COMPONENTS ---

const RolePermissionsEditor: React.FC<{ permissions: { [key: string]: PagePermissions }; setPermissions: React.Dispatch<React.SetStateAction<{ [key: string]: PagePermissions }>>; }> = ({ permissions, setPermissions }) => {
    const handlePermissionChange = (pageId: string, permission: keyof PagePermissions, value: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [pageId]: { ...prev[pageId], [permission]: value }
        }));
    };

    const handleSelectAll = (pageId: string, value: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [pageId]: { ...prev[pageId], view: value, add: value, edit: value, delete: value }
        }));
    };

    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="px-4 py-2 text-left font-semibold">Módulo</th>
                        <th className="px-4 py-2 text-center font-semibold">Ver</th>
                        <th className="px-4 py-2 text-center font-semibold">Agregar</th>
                        <th className="px-4 py-2 text-center font-semibold">Editar</th>
                        <th className="px-4 py-2 text-center font-semibold">Eliminar</th>
                        <th className="px-4 py-2 text-center font-semibold">Todos</th>
                        <th className="px-4 py-2 text-center font-semibold">Permisos Específicos</th>
                    </tr>
                </thead>
                <tbody>
                    {manageablePages.map(page => {
                        const pagePerms = permissions[page.id] || defaultPermissions;
                        const allChecked = pagePerms.view && pagePerms.add && pagePerms.edit && pagePerms.delete;
                        return (
                            <tr key={page.id} className="border-t">
                                <td className="px-4 py-2 font-medium text-foreground">{page.name}</td>
                                {(['view', 'add', 'edit', 'delete'] as const).map(perm => (
                                    <td key={perm} className="px-4 py-2 text-center">
                                        <input type="checkbox" checked={pagePerms[perm]} onChange={e => handlePermissionChange(page.id, perm, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                    </td>
                                ))}
                                <td className="px-4 py-2 text-center">
                                    <input type="checkbox" checked={allChecked} onChange={e => handleSelectAll(page.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-4 flex-wrap">
                                        {page.id === 'ingreso' && (
                                            <>
                                                <label className="flex items-center gap-2 text-sm text-foreground">
                                                    <input type="checkbox" checked={!!pagePerms.viewCosts} onChange={e => handlePermissionChange(page.id, 'viewCosts', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                                    Ver Costos
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-foreground">
                                                    <input type="checkbox" checked={!!pagePerms.viewAnalysis} onChange={e => handlePermissionChange(page.id, 'viewAnalysis', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                                    Ver Análisis y Catación
                                                </label>
                                            </>
                                        )}
                                        {page.id === 'contracts-lots' && (
                                            <label className="flex items-center gap-2 text-sm text-foreground">
                                                <input type="checkbox" checked={!!pagePerms.viewPrices} onChange={e => handlePermissionChange(page.id, 'viewPrices', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                                Ver Precios
                                            </label>
                                        )}
                                        {page.id === 'reprocesos' && (
                                            <>
                                                <label className="flex items-center gap-2 text-sm text-foreground">
                                                    <input type="checkbox" checked={!!pagePerms.editEntrada} onChange={e => handlePermissionChange(page.id, 'editEntrada', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                                    Editar Entrada
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-foreground">
                                                    <input type="checkbox" checked={!!pagePerms.editSalida} onChange={e => handlePermissionChange(page.id, 'editSalida', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                                    Editar Salida
                                                </label>
                                            </>
                                        )}
                                        {['contracts-info', 'ventasLocales', 'rendimientos', 'reprocesos'].includes(page.id) && (
                                            <label className="flex items-center gap-2 text-sm text-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={!!pagePerms.canFinalize}
                                                    onChange={e => handlePermissionChange(page.id, 'canFinalize', e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                />
                                                Marcar/Editar Finalizado
                                            </label>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const AddUserModal: React.FC<{ roles: AppRole[]; onSave: (newUser: { name: string; email: string; role: string }) => void; onCancel: () => void; }> = ({ roles, onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState(roles.find(r => !r.isDefault)?.name || '');
    const { addToast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !role) {
            addToast("Nombre, email y rol son requeridos.", "error");
            return;
        }
        onSave({ name, email, role });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-bold text-foreground mb-4">Invitar Nuevo Usuario</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Nombre</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">Correo Electrónico</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-muted-foreground mb-1">Rol</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm">
                            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Invitar Usuario</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditUserModal: React.FC<{ user: AppUser; roles: AppRole[]; onSave: (user: AppUser) => void; onCancel: () => void; }> = ({ user, roles, onSave, onCancel }) => {
    const [name, setName] = useState(user.name || '');
    const [selectedRole, setSelectedRole] = useState(user.role);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...user, name, role: selectedRole });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-bold text-foreground mb-4">Editar Usuario: {user.email}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="editName" className="block text-sm font-medium text-muted-foreground mb-1">Nombre</label>
                        <input id="editName" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="role" className="block text-sm font-medium text-muted-foreground mb-1">Rol</label>
                        <select id="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as AppUserRole)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm">
                            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddRoleModal: React.FC<{ onSave: (newRole: { name: string, permissions: { [key: string]: PagePermissions } }) => void; onCancel: () => void; }> = ({ onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState(getDefaultRolePermissions());
    const { addToast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            addToast("El nombre del rol es requerido.", "error");
            return;
        }
        onSave({ name: name.trim(), permissions });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold text-foreground mb-4">Crear Nuevo Rol</h3>
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Nombre del Rol</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    </div>
                    <h4 className="text-md font-semibold text-foreground pt-2">Permisos del Rol</h4>
                    <RolePermissionsEditor permissions={permissions} setPermissions={setPermissions} />
                </form>
                <div className="mt-6 flex justify-end gap-4 border-t pt-4 flex-shrink-0">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Crear Rol</button>
                </div>
            </div>
        </div>
    );
};

const EditRoleModal: React.FC<{ role: AppRole; onSave: (role: AppRole) => void; onCancel: () => void; }> = ({ role, onSave, onCancel }) => {
    const [name, setName] = useState(role.name);
    const [permissions, setPermissions] = useState(role.permissions || getDefaultRolePermissions());
    const { addToast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            addToast("El nombre del rol es requerido.", "error");
            return;
        }
        onSave({ ...role, name: name.trim(), permissions });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold text-foreground mb-4">Editar Rol: {role.name}</h3>
                <form onSubmit={handleSubmit} className="space-y-4 flex-grow overflow-y-auto pr-2">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Nombre del Rol</label>
                        <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    </div>
                    <h4 className="text-md font-semibold text-foreground pt-2">Permisos del Rol</h4>
                    <RolePermissionsEditor permissions={permissions} setPermissions={setPermissions} />
                </form>
                 <div className="mt-6 flex justify-end gap-4 border-t pt-4 flex-shrink-0">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---

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
                <nav className="flex space-x-4 -mb-px overflow-x-auto">
                    <TabButton tab="users" label="Gestionar Usuarios" />
                    <TabButton tab="roles" label="Gestionar Roles" />
                    <TabButton tab="notifications" label="Notificaciones" />
                    <TabButton tab="coffeeTypes" label="Tipos de Café" />
                    <TabButton tab="byproducts" label="Tipos de Sub Productos" />
                    <TabButton tab="logs" label="Bitácora de Actividad" />
                </nav>
            </div>
            <div className="p-6">
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'roles' && <RoleManagement />}
                {activeTab === 'notifications' && <NotificationsTab />}
                {activeTab === 'coffeeTypes' && <CoffeeTypesPage />}
                {activeTab === 'byproducts' && <ByproductTypesPage />}
                {activeTab === 'logs' && <LogsTab />}
            </div>
        </div>
    );
};

// --- USER MANAGEMENT COMPONENT ---

const UserManagement: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.admin;
    const [users, setUsers] = useState<AppUser[]>([]);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
    const [userToEdit, setUserToEdit] = useState<AppUser | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const { addToast } = useToast();

    const fetchUsersAndRoles = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                api.getCollection<AppUser>("users"),
                api.getCollection<AppRole>("roles")
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Error fetching users and roles: ", error);
            addToast("Error al cargar usuarios y roles.", "error");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsersAndRoles();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['users', 'roles'].includes(customEvent.detail.collectionName)) {
                fetchUsersAndRoles();
            }
        };
        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
    }, []);
    
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await api.deleteDocument('users', userToDelete.id!);
            addToast("Usuario eliminado con éxito.", "success");
        } catch (error) {
            console.error("Error deleting user:", error);
            addToast("Error al eliminar el usuario.", "error");
        } finally {
            setUserToDelete(null);
        }
    };

    const handleUpdateUser = async (updatedUser: AppUser) => {
        if (!userToEdit) return;
        try {
            await api.updateDocument<AppUser>('users', userToEdit.id!, { name: updatedUser.name, role: updatedUser.role });
            addToast("Usuario actualizado con éxito.", "success");
        } catch (error) {
            console.error("Error updating user:", error);
            addToast("Error al actualizar el usuario.", "error");
        } finally {
            setUserToEdit(null);
        }
    };

    const handleInviteUser = async (newUser: { name: string; email: string; role: string }) => {
        try {
            await api.addDocument<AppUser>('users', { name: newUser.name, email: newUser.email, role: newUser.role as AppUserRole });
            addToast("Usuario invitado con éxito.", "success");
        } catch (error) {
            console.error("Error inviting user:", error);
            addToast("Error al invitar al usuario.", "error");
        } finally {
            setIsAddingUser(false);
        }
    };


    return (
        <div>
            <div className="flex justify-end mb-4">
                {permissions?.add && <button onClick={() => setIsAddingUser(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" />
                    Invitar Usuario
                </button>}
            </div>
            <div className="bg-muted/50 rounded-lg">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre</th>
                            <th scope="col" className="px-6 py-3">Correo Electrónico</th>
                            <th scope="col" className="px-6 py-3">Rol</th>
                            <th scope="col" className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan={4} className="text-center py-10">Cargando usuarios...</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className="border-b border-border bg-card hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{user.name || 'N/A'}</td>
                                <td className="px-6 py-4 font-medium text-foreground">{user.email}</td>
                                <td className="px-6 py-4 text-blue-600 dark:text-blue-400">{user.role}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        {permissions?.edit && <button 
                                            onClick={() => setUserToEdit(user)}
                                            className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={user.role === 'Admin'}
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>}
                                        {permissions?.delete && <button 
                                            onClick={() => setUserToDelete(user)} 
                                            className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                            disabled={user.role === 'Admin'}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isAddingUser && <AddUserModal roles={roles} onSave={handleInviteUser} onCancel={() => setIsAddingUser(false)} />}
            {userToEdit && <EditUserModal user={userToEdit} roles={roles} onSave={handleUpdateUser} onCancel={() => setUserToEdit(null)} />}
            {userToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar al usuario <strong>{userToDelete.email}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setUserToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={handleDeleteUser} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Eliminar Usuario
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- ROLE MANAGEMENT COMPONENT ---

const RoleManagement: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.admin;
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleToDelete, setRoleToDelete] = useState<AppRole | null>(null);
    const [roleToEdit, setRoleToEdit] = useState<AppRole | null>(null);
    const [isAddingRole, setIsAddingRole] = useState(false);
    const { addToast } = useToast();

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const rolesData = await api.getCollection<AppRole>("roles");
            const rolesWithPermissions = rolesData.map(role => ({
                ...role,
                permissions: role.permissions || getDefaultRolePermissions(),
            }));
            setRoles(rolesWithPermissions);
        } catch (error) {
            console.error("Error fetching roles: ", error);
            addToast("Error al cargar roles.", "error");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRoles();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.collectionName === 'roles') {
                fetchRoles();
            }
        };
        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
    }, []);

    const handleDeleteRole = async () => {
        if (!roleToDelete) return;
        try {
            await api.deleteDocument('roles', roleToDelete.id!);
            addToast("Rol eliminado con éxito.", "success");
        } catch (error) {
            console.error("Error deleting role:", error);
            addToast("Error al eliminar el rol.", "error");
        } finally {
            setRoleToDelete(null);
        }
    };

     const handleUpdateRole = async (updatedRole: AppRole) => {
        if (!roleToEdit) return;
        try {
            await api.updateDocument<AppRole>('roles', roleToEdit.id!, { 
                name: updatedRole.name,
                permissions: updatedRole.permissions
            });
            addToast("Rol actualizado con éxito.", "success");
        } catch (error) {
            console.error("Error updating role:", error);
            addToast("Error al actualizar el rol.", "error");
        } finally {
            setRoleToEdit(null);
        }
    };

    const handleAddRole = async (newRole: { name: string, permissions: { [key: string]: PagePermissions } }) => {
        try {
            await api.addDocument<AppRole>('roles', { ...newRole, isDefault: false });
            addToast("Rol creado con éxito.", "success");
        } catch (error) {
            console.error("Error adding role:", error);
            addToast("Error al crear el rol.", "error");
        } finally {
            setIsAddingRole(false);
        }
    };

    return (
    <div>
        <div className="flex justify-end mb-4">
            {permissions?.add && <button onClick={() => setIsAddingRole(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                <PlusIcon className="w-4 h-4" />
                Crear Rol
            </button>}
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
                            <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">
                                {role.name} {role.isDefault && <span className="text-xs text-muted-foreground">(Default)</span>}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    {permissions?.edit && <button 
                                        onClick={() => setRoleToEdit(role)}
                                        className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        disabled={role.isDefault}
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>}
                                    {permissions?.delete && <button 
                                        onClick={() => setRoleToDelete(role)}
                                        className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                        disabled={role.isDefault}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {isAddingRole && <AddRoleModal onSave={handleAddRole} onCancel={() => setIsAddingRole(false)} />}
        {roleToEdit && <EditRoleModal role={roleToEdit} onSave={handleUpdateRole} onCancel={() => setRoleToEdit(null)} />}
        {roleToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                    <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                        ¿Estás seguro de que quieres eliminar el rol <strong>{roleToDelete.name}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-6 flex justify-end gap-4">
                        <button onClick={() => setRoleToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                            Cancelar
                        </button>
                        <button onClick={handleDeleteRole} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                            Eliminar Rol
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};


export default AdminPage;