import React, { useState, useEffect } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
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
    const [exporterToDelete, setExporterToDelete] = useState<Exporter | null>(null);
    const [exporterToEdit, setExporterToEdit] = useState<Exporter | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const fetchExporters = async () => {
            setLoading(true);
            try {
                const exportersData = await api.getCollection<Exporter>("exporters");
                setExporters(exportersData);
            } catch (error) {
                console.error("Error fetching exporters: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchExporters();

        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.collectionName === 'exporters') {
                fetchExporters();
            }
        };

        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleAddExporter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newExporterName.trim() === '' || newLicenseNumber.trim() === '') return;
        
        setIsAdding(true);
        try {
            await api.addDocument<Exporter>("exporters", { 
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

    const handleDeleteClick = (exporter: Exporter) => {
        setExporterToDelete(exporter);
    };

    const cancelDelete = () => {
        setExporterToDelete(null);
    };

    const confirmDelete = async () => {
        if (!exporterToDelete) return;
        try {
            await api.deleteDocument('exporters', exporterToDelete.id!);
        } catch (error) {
            console.error("Error deleting exporter:", error);
        } finally {
            setExporterToDelete(null);
        }
    };

    const handleEditClick = (exporter: Exporter) => {
        setExporterToEdit({ ...exporter });
    };

    const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!exporterToEdit) return;
        const { name, value } = e.target;
        setExporterToEdit({ ...exporterToEdit, [name]: value });
    };

    const handleUpdateExporter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!exporterToEdit || !exporterToEdit.name.trim() || !exporterToEdit.licenseNumber.trim()) return;

        setIsUpdating(true);
        try {
            // FIX: Object literal may only specify known properties, and 'name' does not exist in type 'Partial<{ id?: string; }>'.
            await api.updateDocument<Exporter>('exporters', exporterToEdit.id!, {
                name: exporterToEdit.name.trim(),
                licenseNumber: exporterToEdit.licenseNumber.trim()
            });
            setExporterToEdit(null);
        } catch (error) {
            console.error("Error updating exporter:", error);
        } finally {
            setIsUpdating(false);
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
                                            <button className="text-yellow-500 hover:text-yellow-700" onClick={() => handleEditClick(exporter)}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700" onClick={() => handleDeleteClick(exporter)}>
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

            {exporterToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground mb-4">Editar Exportadora</h3>
                        <form onSubmit={handleUpdateExporter}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="editName" className="block text-sm font-medium text-muted-foreground mb-1">Nombre</label>
                                    <input
                                        id="editName"
                                        name="name"
                                        type="text"
                                        value={exporterToEdit.name}
                                        onChange={handleUpdateChange}
                                        className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="editLicense" className="block text-sm font-medium text-muted-foreground mb-1">No. de Licencia</label>
                                    <input
                                        id="editLicense"
                                        name="licenseNumber"
                                        type="text"
                                        value={exporterToEdit.licenseNumber}
                                        onChange={handleUpdateChange}
                                        className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-4">
                                <button type="button" onClick={() => setExporterToEdit(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
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

            {exporterToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar a <strong>{exporterToDelete.name}</strong>? Esta acción no se puede deshacer.
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

export default ExportersPage;
