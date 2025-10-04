import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Supplier } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>({
        name: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, "suppliers"), 
            (snapshot) => {
                const suppliersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
                setSuppliers(suppliersData);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching suppliers: ", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
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
            await addDoc(collection(db, "suppliers"), newSupplier);
            setNewSupplier({ name: '', phone: '', email: '' });
        } catch (error) {
            console.error("Error adding supplier: ", error);
        } finally {
            setIsAdding(false);
        }
    };
    
    return (
        <div>
             <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                <input type="text" name="name" value={newSupplier.name} onChange={handleInputChange} placeholder="Nombre Proveedor" required className="md:col-span-2 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                <input type="text" name="phone" value={newSupplier.phone} onChange={handleInputChange} placeholder="Teléfono" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                <input type="email" name="email" value={newSupplier.email} onChange={handleInputChange} placeholder="Email" className="px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm" />
                
                <button 
                    type="submit"
                    disabled={isAdding || !newSupplier.name.trim()}
                    className="md:col-span-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                    <PlusIcon className="w-4 h-4" />
                    {isAdding ? 'Agregando...' : 'Agregar Proveedor'}
                </button>
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
                                            <button className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400" disabled>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700 disabled:text-gray-400" disabled>
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
        </div>
    );
};

export default SuppliersPage;
