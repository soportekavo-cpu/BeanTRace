import React, { useState, useEffect } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Buyer } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const BuyersPage: React.FC = () => {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [buyerToDelete, setBuyerToDelete] = useState<Buyer | null>(null);
    const [buyerToEdit, setBuyerToEdit] = useState<Buyer | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const initialBuyerState = {
        name: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: ''
    };
    const [newBuyer, setNewBuyer] = useState<Omit<Buyer, 'id'>>(initialBuyerState);

    useEffect(() => {
        const fetchBuyers = async () => {
            setLoading(true);
            try {
                const buyersData = await api.getCollection<Buyer>("buyers");
                setBuyers(buyersData);
            } catch (error) {
                console.error("Error fetching buyers: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBuyers();
        
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.collectionName === 'buyers') {
                fetchBuyers();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewBuyer(prev => ({ ...prev, [name]: value }));
    };

    const handleAddBuyer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newBuyer.name.trim() === '') return;
        
        setIsAdding(true);
        try {
            await api.addDocument<Buyer>("buyers", newBuyer);
            setNewBuyer(initialBuyerState);
        } catch (error) {
            console.error("Error adding buyer: ", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteClick = (buyer: Buyer) => {
        setBuyerToDelete(buyer);
    };

    const cancelDelete = () => {
        setBuyerToDelete(null);
    };

    const confirmDelete = async () => {
        if (!buyerToDelete) return;
        try {
            await api.deleteDocument('buyers', buyerToDelete.id!);
        } catch (error) {
            console.error("Error deleting buyer:", error);
        } finally {
            setBuyerToDelete(null);
        }
    };
    
    const handleEditClick = (buyer: Buyer) => {
        setBuyerToEdit({ ...buyer });
    };

    const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!buyerToEdit) return;
        const { name, value } = e.target;
        setBuyerToEdit({ ...buyerToEdit, [name]: value });
    };

    const handleUpdateBuyer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyerToEdit || !buyerToEdit.name.trim()) return;

        setIsUpdating(true);
        try {
            await api.updateDocument('buyers', buyerToEdit.id!, buyerToEdit);
            setBuyerToEdit(null);
        } catch (error) {
            console.error("Error updating buyer:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div>
             <form onSubmit={handleAddBuyer} className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" value={newBuyer.name} onChange={handleInputChange} placeholder="Nombre Comprador" required className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    <input type="text" name="contactPerson" value={newBuyer.contactPerson} onChange={handleInputChange} placeholder="Persona de Contacto" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                </div>
                <input type="text" name="address" value={newBuyer.address} onChange={handleInputChange} placeholder="Dirección" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="phone" value={newBuyer.phone} onChange={handleInputChange} placeholder="Teléfono" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    <input type="email" name="email" value={newBuyer.email} onChange={handleInputChange} placeholder="Email" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                </div>
                <div className="flex justify-end">
                    <button 
                        type="submit"
                        disabled={isAdding || !newBuyer.name.trim()}
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
                            <th scope="col" className="px-6 py-3">Contacto</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-10">Cargando compradores...</td></tr>
                        ) : buyers.length > 0 ? (
                            buyers.map((buyer) => (
                                <tr key={buyer.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{buyer.name}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{buyer.contactPerson}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{buyer.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button className="text-yellow-500 hover:text-yellow-700" onClick={() => handleEditClick(buyer)}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(buyer)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={4} className="text-center py-10">No hay compradores. ¡Agrega el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {buyerToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-bold text-foreground mb-4">Editar Comprador</h3>
                        <form onSubmit={handleUpdateBuyer} className="space-y-4">
                            <input type="text" name="name" value={buyerToEdit.name} onChange={handleUpdateChange} placeholder="Nombre Comprador" required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="text" name="contactPerson" value={buyerToEdit.contactPerson} onChange={handleUpdateChange} placeholder="Persona de Contacto" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="text" name="address" value={buyerToEdit.address} onChange={handleUpdateChange} placeholder="Dirección" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="text" name="phone" value={buyerToEdit.phone} onChange={handleUpdateChange} placeholder="Teléfono" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="email" name="email" value={buyerToEdit.email} onChange={handleUpdateChange} placeholder="Email" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setBuyerToEdit(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
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

            {buyerToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar a <strong>{buyerToDelete.name}</strong>? Esta acción no se puede deshacer.
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

export default BuyersPage;