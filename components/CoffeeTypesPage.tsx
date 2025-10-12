

import React, { useState, useEffect } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { CoffeeType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const CoffeeTypesPage: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.coffeeTypes;
    const [coffeeTypes, setCoffeeTypes] = useState<CoffeeType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<CoffeeType | null>(null);
    const [itemToEdit, setItemToEdit] = useState<CoffeeType | null>(null);
    const [newItem, setNewItem] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await api.getCollection<CoffeeType>("coffeeTypes");
            setCoffeeTypes(data);
        } catch (error) {
            console.error("Error fetching coffee types: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.collectionName === 'coffeeTypes') {
                fetchData();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim() === '') return;

        setIsAdding(true);
        try {
            await api.addDocument<CoffeeType>("coffeeTypes", { tipo: newItem.trim() });
            setNewItem('');
        } catch (error) {
            console.error("Error adding coffee type: ", error);
        } finally {
            setIsAdding(false);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.deleteDocument('coffeeTypes', itemToDelete.id!);
        } catch (error) {
            console.error("Error deleting item:", error);
        } finally {
            setItemToDelete(null);
        }
    };
    
    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemToEdit || !itemToEdit.tipo.trim()) return;

        try {
            // FIX: Explicitly provide the generic type to `updateDocument` to ensure correct type inference.
            await api.updateDocument<CoffeeType>('coffeeTypes', itemToEdit.id!, { tipo: itemToEdit.tipo.trim() });
            setItemToEdit(null);
        } catch (error) {
            console.error("Error updating item:", error);
        }
    };
    
    return (
        <div>
            {permissions?.add && (
                <form onSubmit={handleAddItem} className="flex gap-4 mb-6 pb-6 border-b">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Nombre del nuevo tipo de café"
                        className="flex-grow px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                    />
                    <button 
                        type="submit"
                        disabled={isAdding || !newItem.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                        <PlusIcon className="w-4 h-4" />
                        {isAdding ? 'Agregando...' : 'Agregar'}
                    </button>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">Tipo de Café</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="text-center py-10">Cargando...</td></tr>
                        ) : coffeeTypes.length > 0 ? (
                            coffeeTypes.map((item) => (
                                <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{item.tipo}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            {permissions?.edit && <button className="text-yellow-500 hover:text-yellow-700" onClick={() => setItemToEdit(item)}><PencilIcon className="w-4 h-4" /></button>}
                                            {permissions?.delete && <button className="text-red-500 hover:text-red-700" onClick={() => setItemToDelete(item)}><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={2} className="text-center py-10">No hay tipos de café definidos.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {itemToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <form onSubmit={handleUpdateItem} className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground mb-4">Editar Tipo de Café</h3>
                        <input
                            type="text"
                            value={itemToEdit.tipo}
                            onChange={(e) => setItemToEdit({...itemToEdit, tipo: e.target.value})}
                            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                            required
                        />
                        <div className="mt-6 flex justify-end gap-4">
                            <button type="button" onClick={() => setItemToEdit(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            )}

            {itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">¿Estás seguro de que quieres eliminar <strong>{itemToDelete.tipo}</strong>?</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setItemToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoffeeTypesPage;