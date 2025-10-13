import React, { useState, useEffect } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Supplier, PurchaseReceipt } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const initialSupplierState = { name: '', phone: '', email: '' };
    const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>(initialSupplierState);

    useEffect(() => {
        const fetchSuppliers = async () => {
            setLoading(true);
            try {
                const suppliersData = await api.getCollection<Supplier>("suppliers");
                setSuppliers(suppliersData);
            } catch (error) {
                console.error("Error fetching suppliers: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSuppliers();
        
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.collectionName === 'suppliers') {
                fetchSuppliers();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewSupplier(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newSupplier.name.trim() === '') return;
        
        setIsAdding(true);
        try {
            await api.addDocument<Supplier>("suppliers", newSupplier);
            setNewSupplier(initialSupplierState);
        } catch (error) {
            console.error("Error adding supplier: ", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteClick = (supplier: Supplier) => {
        setSupplierToDelete(supplier);
    };

    const cancelDelete = () => {
        setSupplierToDelete(null);
    };

    const confirmDelete = async () => {
        if (!supplierToDelete) return;
        try {
            const purchaseReceipts = await api.getCollection<PurchaseReceipt>('purchaseReceipts', pr => pr.proveedorId === supplierToDelete.id);
            if (purchaseReceipts.length > 0) {
                alert(`No se puede eliminar el proveedor '${supplierToDelete.name}' porque está asociado a ${purchaseReceipts.length} recibo(s) de compra.`);
                setSupplierToDelete(null);
                return;
            }
            await api.deleteDocument('suppliers', supplierToDelete.id!);
        } catch (error) {
            console.error("Error deleting supplier:", error);
        } finally {
            setSupplierToDelete(null);
        }
    };

    const handleEditClick = (supplier: Supplier) => {
        setSupplierToEdit({ ...supplier });
    };
    
    const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!supplierToEdit) return;
        const { name, value } = e.target;
        setSupplierToEdit({ ...supplierToEdit, [name]: value });
    };

    const handleUpdateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierToEdit || !supplierToEdit.name.trim()) return;

        setIsUpdating(true);
        try {
            await api.updateDocument('suppliers', supplierToEdit.id!, supplierToEdit);
            setSupplierToEdit(null);
        } catch (error) {
            console.error("Error updating supplier:", error);
        } finally {
            setIsUpdating(false);
        }
    };
    
    return (
        <div>
             <form onSubmit={handleAddSupplier} className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" name="name" value={newSupplier.name} onChange={handleInputChange} placeholder="Nombre Proveedor" required className="md:col-span-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    <input type="text" name="phone" value={newSupplier.phone} onChange={handleInputChange} placeholder="Teléfono" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                    <input type="email" name="email" value={newSupplier.email} onChange={handleInputChange} placeholder="Email" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                </div>
                <div className="flex justify-end">
                    <button 
                        type="submit"
                        disabled={isAdding || !newSupplier.name.trim()}
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
                            <tr><td colSpan={4} className="text-center py-10">Cargando proveedores...</td></tr>
                        ) : suppliers.length > 0 ? (
                            suppliers.map((supplier) => (
                                <tr key={supplier.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{supplier.name}</td>
                                    <td className="px-6 py-4">{supplier.phone}</td>
                                    <td className="px-6 py-4">{supplier.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button className="text-yellow-500 hover:text-yellow-700" onClick={() => handleEditClick(supplier)}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(supplier)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={4} className="text-center py-10">No hay proveedores. ¡Agrega el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {supplierToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground mb-4">Editar Proveedor</h3>
                        <form onSubmit={handleUpdateSupplier} className="space-y-4">
                            <input type="text" name="name" value={supplierToEdit.name} onChange={handleUpdateChange} placeholder="Nombre Proveedor" required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="text" name="phone" value={supplierToEdit.phone} onChange={handleUpdateChange} placeholder="Teléfono" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <input type="email" name="email" value={supplierToEdit.email} onChange={handleUpdateChange} placeholder="Email" className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setSupplierToEdit(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
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

            {supplierToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar a <strong>{supplierToDelete.name}</strong>? Esta acción no se puede deshacer.
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

export default SuppliersPage;