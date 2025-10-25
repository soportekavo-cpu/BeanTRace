

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/localStorageManager';
import { Exporter, Contract } from '../types';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import { useToast } from '../hooks/useToast';

const ExportersPage: React.FC = () => {
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [newExporterName, setNewExporterName] = useState('');
    const [newLicenseNumber, setNewLicenseNumber] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [exporterToDelete, setExporterToDelete] = useState<Exporter | null>(null);
    const [exporterToEdit, setExporterToEdit] = useState<Exporter | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const { addToast } = useToast();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [exporterForLogoUpload, setExporterForLogoUpload] = useState<Exporter | null>(null);

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

        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
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
            const contracts = await api.getCollection<Contract>('contracts', c => c.exporterId === exporterToDelete.id);
            if (contracts.length > 0) {
                addToast(`No se puede eliminar la exportadora '${exporterToDelete.name}' porque está asociada a ${contracts.length} contrato(s).`, 'error');
                setExporterToDelete(null);
                return;
            }
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

    const handleLogoUploadClick = (exporter: Exporter) => {
        setExporterForLogoUpload(exporter);
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !exporterForLogoUpload) {
            return;
        }

        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = async () => {
            try {
                await api.updateDocument<Exporter>('exporters', exporterForLogoUpload.id, {
                    logo: reader.result as string
                });
            } catch (error) {
                console.error("Error uploading logo:", error);
            } finally {
                setExporterForLogoUpload(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""; // Reset file input
                }
            }
        };

        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            setExporterForLogoUpload(null);
        };
        
        reader.readAsDataURL(file);
    };
    
    return (
        <div>
            <input 
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleFileChange}
            />
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
                            <th scope="col" className="px-6 py-3">Logo</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="text-center py-10">Cargando...</td></tr>
                        ) : exporters.length > 0 ? (
                            exporters.map((exporter) => (
                                <tr key={exporter.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{exporter.name}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{exporter.licenseNumber}</td>
                                    <td className="px-6 py-4">
                                        {exporter.logo ? (
                                            <img src={exporter.logo} alt={`${exporter.name} logo`} className="h-10 w-auto bg-white p-1 rounded border"/>
                                        ) : (
                                            <div className="h-10 w-20 bg-muted/50 rounded border flex items-center justify-center text-xs">Sin Logo</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                                className="text-blue-500 hover:text-blue-700" 
                                                onClick={() => handleLogoUploadClick(exporter)}
                                                title="Subir Logo"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            </button>
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
                             <tr><td colSpan={4} className="text-center py-10">No hay exportadoras. ¡Agrega la primera!</td></tr>
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