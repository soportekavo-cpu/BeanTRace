import React, { useState, useEffect } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Client, ThreshingOrder, Salida } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const ClientsPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const initialClientState = { name: '', phone: '', email: '' };
    const [newClient, setNewClient] = useState<Omit<Client, 'id'>>(initialClientState);

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            try {
                const clientsData = await api.getCollection<Client>("clients");
                setClients(clientsData);
            } catch (error) {
                console.error("Error fetching clients: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClients();

        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.collectionName === 'clients') {
                fetchClients();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewClient(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newClient.name.trim() === '') return;
        
        setIsAdding(true);
        try {
            await api.addDocument<Client>("clients", newClient);
            setNewClient(initialClientState);
        } catch (error) {
            console.error("Error adding client: ", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteClick = (client: Client) => {
        setClientToDelete(client);
    };

    const cancelDelete = () => {
        setClientToDelete(null);
    };

    const confirmDelete = async () => {
        if (!clientToDelete) return;
        try {
            const [threshingOrders, salidas] = await Promise.all([
                api.getCollection<ThreshingOrder>('threshingOrders', o => o.clientId === clientToDelete.id),
                api.getCollection<Salida>('salidas', s => s.clienteId === clientToDelete.id)
            ]);

            if (threshingOrders.length > 0 || salidas.length > 0) {
                alert(`No se puede eliminar el cliente '${clientToDelete.name}' porque está asociado a ${threshingOrders.length} orden(es) de venta local y ${salidas.length} salida(s).`);
                setClientToDelete(null);
                return;
            }

            await api.deleteDocument('clients', clientToDelete.id!);
        } catch (error) {
            console.error("Error deleting client:", error);
        } finally {
            setClientToDelete(null);
        }
    };
    
    const handleEditClick = (client: Client) => {
        setClientToEdit({ ...client });
    };

    const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!clientToEdit) return;
        const { name, value } = e.target;
        setClientToEdit({ ...clientToEdit, [name]: value });
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientToEdit || !clientToEdit.name.trim()) return;

        setIsUpdating(true);
        try {
            await api.updateDocument('clients', clientToEdit.id!, clientToEdit);
            setClientToEdit(null);
        } catch (error) {
            console.error("Error updating client:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div>
             <form onSubmit={handleAddClient} className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="name" value={newClient.name} onChange={handleInputChange} placeholder="Nombre Cliente" required className="md:col-span-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    <input type="text" name="phone" value={newClient.phone} onChange={handleInputChange} placeholder="Teléfono" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    <input type="email" name="email" value={newClient.email} onChange={handleInputChange} placeholder="Email" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                </div>
                <div className="flex justify-end">
                    <button 
                        type="submit"
                        disabled={isAdding || !newClient.name.trim()}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:bg-green-500 disabled:cursor-not-allowed">
                        <PlusIcon className="w-4 h-4" />
                        {isAdding ? 'Agregando...' : 'Agregar'}
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre</th>
                            <th scope="col" className="px-6 py-3">Teléfono</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-10">Cargando clientes...</td></tr>
                        ) : clients.length > 0 ? (
                            clients.map((client) => (
                                <tr key={client.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{client.name}</td>
                                    <td className="px-6 py-4">{client.phone}</td>
                                    <td className="px-6 py-4">{client.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button className="text-yellow-500 hover:text-yellow-700" onClick={() => handleEditClick(client)}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(client)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={4} className="text-center py-10">No hay clientes. ¡Agrega el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {clientToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground mb-4">Editar Cliente</h3>
                        <form onSubmit={handleUpdateClient} className="space-y-4">
                            <input type="text" name="name" value={clientToEdit.name} onChange={handleUpdateChange} placeholder="Nombre Cliente" required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="text" name="phone" value={clientToEdit.phone} onChange={handleUpdateChange} placeholder="Teléfono" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="email" name="email" value={clientToEdit.email} onChange={handleUpdateChange} placeholder="Email" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setClientToEdit(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isUpdating} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                                    {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {clientToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar a <strong>{clientToDelete.name}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={cancelDelete} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsPage;