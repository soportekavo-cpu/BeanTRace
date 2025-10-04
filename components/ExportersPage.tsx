import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Exporter } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';

const ExportersPage: React.FC = () => {
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [newExporterName, setNewExporterName] = useState('');
    const [newLicenseNumber, setNewLicenseNumber] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, "exporters"), 
            (snapshot) => {
                const exportersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exporter));
                setExporters(exportersData);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching exporters: ", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleAddExporter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newExporterName.trim() === '' || newLicenseNumber.trim() === '') return;
        
        setIsAdding(true);
        try {
            await addDoc(collection(db, "exporters"), { 
                name: newExporterName.trim(),
                licenseNumber: newLicenseNumber.trim()
            });
            setNewExporterName('');
            setNewLicenseNumber('');
        } catch (error) {
            console.error("Error adding exporter: ", error);
        } finally {
            setIsAdding(false);
        }
    };
    
    return (
        <div>
            <form onSubmit={handleAddExporter} className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input
                        type="text"
                        value={newExporterName}
                        onChange={(e) => setNewExporterName(e.target.value)}
                        placeholder="Nombre de la exportadora"
                        className="md:col-span-2 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                    />
                    <input
                        type="text"
                        value={newLicenseNumber}
                        onChange={(e) => setNewLicenseNumber(e.target.value)}
                        placeholder="No. de Licencia"
                        className="md:col-span-2 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                    />
                     <div className="flex justify-end md:col-span-1">
                        <button 
                            type="submit"
                            disabled={isAdding || !newExporterName.trim() || !newLicenseNumber.trim()}
                            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-md hover:bg-green-800 disabled:bg-green-500 disabled:cursor-not-allowed">
                            <PlusIcon className="w-4 h-4" />
                            {isAdding ? 'Agregando...' : 'Agregar'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre</th>
                            <th scope="col" className="px-6 py-3">No. Licencia</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} className="text-center py-10">Cargando...</td></tr>
                        ) : exporters.length > 0 ? (
                            exporters.map((exporter) => (
                                <tr key={exporter.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{exporter.name}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{exporter.licenseNumber}</td>
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
                             <tr><td colSpan={3} className="text-center py-10">No hay exportadoras. ¡Agrega la primera!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExportersPage;