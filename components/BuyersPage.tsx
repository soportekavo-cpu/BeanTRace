import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Buyer } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const BuyersPage: React.FC = () => {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    const [newBuyer, setNewBuyer] = useState<Omit<Buyer, 'id'>>({
        name: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: ''
    });

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewBuyer(prev => ({ ...prev, [name]: value }));
    };

    const handleAddBuyer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newBuyer.name.trim() === '') return;
        
        setIsAdding(true);
        try {
            await addDoc(collection(db, "buyers"), newBuyer);
            setNewBuyer({ name: '', address: '', contactPerson: '', phone: '', email: '' });
        } catch (error) {
            console.error("Error adding buyer: ", error);
        } finally {
            setIsAdding(false);
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
                             <tr><td colSpan={4} className="text-center py-10">No hay compradores. ¡Agrega el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BuyersPage;