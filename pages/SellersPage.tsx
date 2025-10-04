import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Seller } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

const SellersPage: React.FC = () => {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSellerName, setNewSellerName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, "sellers"), 
            (snapshot) => {
                const sellersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
                setSellers(sellersData);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching sellers: ", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleAddSeller = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newSellerName.trim() === '') return;
        
        setIsAdding(true);
        try {
            await addDoc(collection(db, "sellers"), { name: newSellerName.trim() });
            setNewSellerName('');
        } catch (error) {
            console.error("Error adding seller: ", error);
        } finally {
            setIsAdding(false);
        }
    };
    
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Gestionar Vendedores</h2>
            </div>
            
            <form onSubmit={handleAddSeller} className="flex gap-4 mb-6 pb-6 border-b">
                <input
                    type="text"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                    placeholder="Nombre del nuevo vendedor"
                    className="flex-grow px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                />
                <button 
                    type="submit"
                    disabled={isAdding || !newSellerName.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                    <PlusIcon className="w-4 h-4" />
                    {isAdding ? 'Agregando...' : 'Agregar'}
                </button>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre del Vendedor</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="text-center py-10">Cargando vendedores...</td></tr>
                        ) : sellers.length > 0 ? (
                            sellers.map((seller) => (
                                <tr key={seller.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{seller.name}</td>
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
                             <tr><td colSpan={2} className="text-center py-10">No hay vendedores. ¡Agrega el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SellersPage;