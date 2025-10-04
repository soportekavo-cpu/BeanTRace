import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Buyer } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

const BuyersPage: React.FC = () => {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [newBuyerName, setNewBuyerName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, "buyers"), 
            (snapshot) => {
                const buyersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Buyer));
                setBuyers(buyersData);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching buyers: ", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleAddBuyer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newBuyerName.trim() === '') return;
        
        setIsAdding(true);
        try {
            await addDoc(collection(db, "buyers"), { name: newBuyerName.trim() });
            setNewBuyerName('');
        } catch (error) {
            console.error("Error adding buyer: ", error);
        } finally {
            setIsAdding(false);
        }
    };
    
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Gestionar Compradores</h2>
            </div>
            
            <form onSubmit={handleAddBuyer} className="flex gap-4 mb-6 pb-6 border-b">
                <input
                    type="text"
                    value={newBuyerName}
                    onChange={(e) => setNewBuyerName(e.target.value)}
                    placeholder="Nombre del nuevo comprador"
                    className="flex-grow px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                />
                <button 
                    type="submit"
                    disabled={isAdding || !newBuyerName.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                    <PlusIcon className="w-4 h-4" />
                    {isAdding ? 'Agregando...' : 'Agregar'}
                </button>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre del Comprador</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="text-center py-10">Cargando compradores...</td></tr>
                        ) : buyers.length > 0 ? (
                            buyers.map((buyer) => (
                                <tr key={buyer.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{buyer.name}</td>
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
                             <tr><td colSpan={2} className="text-center py-10">No hay compradores. ¡Agrega el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BuyersPage;