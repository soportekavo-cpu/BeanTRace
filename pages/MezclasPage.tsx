import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Mezcla, Viñeta, Rendimiento, Reproceso } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import EyeIcon from '../components/icons/EyeIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import MezclaForm from '../components/MezclaForm';
import { printComponent } from '../utils/printUtils';
import MezclaPDF from '../components/MezclaPDF';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ToggleSwitch from '../components/ToggleSwitch';


const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const MezclasPage: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.mezclas;

    const [view, setView] = useState<'list' | 'form'>('list');
    const [mezclas, setMezclas] = useState<Mezcla[]>([]);
    const [rendimientos, setRendimientos] = useState<Rendimiento[]>([]);
    const [reprocesos, setReprocesos] = useState<Reproceso[]>([]);
    const [loading, setLoading] = useState(true);

    const [mezclaToEdit, setMezclaToEdit] = useState<Mezcla | null>(null);
    const [mezclaToView, setMezclaToView] = useState<Mezcla | null>(null);
    const [mezclaToDelete, setMezclaToDelete] = useState<Mezcla | null>(null);
    const [showOnlyInStock, setShowOnlyInStock] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [data, rendimientosData, reprocesosData] = await Promise.all([
                api.getCollection<Mezcla>('mezclas'),
                api.getCollection<Rendimiento>('rendimientos'),
                api.getCollection<Reproceso>('reprocesos'),
            ]);
            setMezclas(data.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
            setRendimientos(rendimientosData);
            setReprocesos(reprocesosData);
        } catch (error) {
            console.error("Error fetching mezclas data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleDataChange = (event: Event) => {
            fetchData();
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleSaveSuccess = async () => {
        setView('list');
        setMezclaToEdit(null);
        await fetchData(); 
    };

    const handleEditClick = (e: React.MouseEvent, mezcla: Mezcla) => {
        e.stopPropagation();
        setMezclaToEdit(mezcla);
        setView('form');
    };

    const handleDeleteClick = (e: React.MouseEvent, mezcla: Mezcla) => {
        e.stopPropagation();
        setMezclaToDelete(mezcla);
    };
    
    const confirmDelete = async () => {
        if (!mezclaToDelete) return;

        try {
            const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const allReprocesos = await api.getCollection<Reproceso>('reprocesos');
            const docsToUpdate = new Map<string, { type: 'Rendimiento' | 'Reproceso', doc: any }>();

            const findAndPrepareUpdate = (
                vignetteId: string, 
                pesoUtilizado: number,
                sourceArray: any[], 
                docType: 'Rendimiento' | 'Reproceso',
                vignetteArrayKey: 'vignettes' | 'outputVignettes'
            ) => {
                for (const doc of sourceArray) {
                    const vignetteIndex = doc[vignetteArrayKey].findIndex((v: Viñeta) => v.id === vignetteId);
                    if (vignetteIndex > -1) {
                        const updatedDoc = docsToUpdate.get(doc.id)?.doc || JSON.parse(JSON.stringify(doc));
                        const vignette = updatedDoc[vignetteArrayKey][vignetteIndex];
                        
                        const newPesoNeto = (vignette.pesoNeto || 0) + pesoUtilizado;
                        vignette.pesoNeto = newPesoNeto;

                        if (Math.abs(newPesoNeto - vignette.originalPesoNeto) < 0.005) {
                            vignette.status = 'En Bodega';
                        } else {
                            vignette.status = 'Mezclada Parcialmente';
                        }

                        docsToUpdate.set(doc.id, { type: docType, doc: updatedDoc });
                        return true;
                    }
                }
                return false;
            };

            for (const usedVignette of mezclaToDelete.inputVignettesData) {
                let found = findAndPrepareUpdate(usedVignette.vignetteId, usedVignette.pesoUtilizado, allRendimientos, 'Rendimiento', 'vignettes');
                if (!found) {
                    findAndPrepareUpdate(usedVignette.vignetteId, usedVignette.pesoUtilizado, allReprocesos, 'Reproceso', 'outputVignettes');
                }
            }

            const updatePromises = Array.from(docsToUpdate.values()).map(item =>
                api.updateDocument(item.type === 'Rendimiento' ? 'rendimientos' : 'reprocesos', item.doc.id, item.doc)
            );

            await Promise.all(updatePromises);
            await api.deleteDocument('mezclas', mezclaToDelete.id);
            setMezclaToDelete(null);
        } catch (error) {
            console.error("Error deleting mezcla:", error);
            alert("No se pudo eliminar la mezcla.");
            setMezclaToDelete(null);
        }
    };
    
    const handlePrint = (mezcla: Mezcla) => {
        printComponent(<MezclaPDF mezcla={mezcla} />, `Mezcla-${mezcla.mezclaNumber}`);
    };

    const filteredMezclas = useMemo(() => {
        if (showOnlyInStock) {
            return mezclas.filter(m => m.sobranteEnBodega > 0.005);
        }
        return mezclas;
    }, [mezclas, showOnlyInStock]);

    if (view === 'form') {
        return <MezclaForm 
            existingMezcla={mezclaToEdit} 
            rendimientos={rendimientos}
            reprocesos={reprocesos}
            onCancel={() => { setView('list'); setMezclaToEdit(null); }} 
            onSaveSuccess={handleSaveSuccess} 
        />;
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Gestión de Mezclas</h2>
                 <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2">
                         <ToggleSwitch id="showOnlyInStock" checked={showOnlyInStock} onChange={setShowOnlyInStock} />
                         <label htmlFor="showOnlyInStock" className="text-sm font-medium text-muted-foreground select-none">Mostrar solo con inventario</label>
                     </div>
                    {permissions?.add && <button onClick={() => { setMezclaToEdit(null); setView('form'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <PlusIcon className="w-4 h-4" /> Crear Mezcla
                    </button>}
                </div>
            </div>

            <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm text-left text-muted-foreground">
                     <thead className="text-xs uppercase bg-muted whitespace-nowrap">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha</th>
                            <th scope="col" className="px-6 py-3">No. Mezcla</th>
                            <th scope="col" className="px-6 py-3">Tipo de Mezcla</th>
                            <th scope="col" className="px-6 py-3 text-right">Total Entrada (qqs.)</th>
                            <th scope="col" className="px-6 py-3 text-right">Despachado (qqs.)</th>
                            <th scope="col" className="px-6 py-3 text-right">En Bodega (qqs.)</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-10">Cargando mezclas...</td></tr>
                        ) : filteredMezclas.length > 0 ? (
                            filteredMezclas.map(mezcla => (
                                <tr key={mezcla.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setMezclaToView(mezcla)}>
                                    <td className="px-6 py-4">{formatDate(mezcla.creationDate)}</td>
                                    <td className="px-6 py-4 font-medium text-purple-600">{mezcla.mezclaNumber}</td>
                                    <td className="px-6 py-4">{mezcla.tipoMezcla}</td>
                                    <td className="px-6 py-4 text-right">{mezcla.totalInputWeight.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">{mezcla.cantidadDespachada.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">{mezcla.sobranteEnBodega.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button className="text-blue-500 hover:text-blue-700" title="Ver Detalle"><EyeIcon className="w-5 h-5" /></button>
                                            {permissions?.edit && <button onClick={(e) => handleEditClick(e, mezcla)} className="text-yellow-500 hover:text-yellow-700" title="Editar"><PencilIcon className="w-4 h-4" /></button>}
                                            <button onClick={(e) => { e.stopPropagation(); handlePrint(mezcla); }} className="text-gray-500 hover:text-gray-700" title="Imprimir"><PrinterIcon className="w-4 h-4" /></button>
                                            {permissions?.delete && <button onClick={(e) => handleDeleteClick(e, mezcla)} className="text-red-500 hover:text-red-700" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={7} className="text-center py-10">{showOnlyInStock ? "No hay mezclas con inventario en bodega." : "No hay mezclas creadas."}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {mezclaToView && <MezclaDetailModal mezcla={mezclaToView} onClose={() => setMezclaToView(null)} />}
            {mezclaToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar la mezcla <strong>{mezclaToDelete.mezclaNumber}</strong>? Las viñetas de entrada volverán al inventario.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setMezclaToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
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


const MezclaDetailModal: React.FC<{ mezcla: Mezcla, onClose: () => void }> = ({ mezcla, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-xl font-bold text-purple-600">Detalle de Mezcla: {mezcla.mezclaNumber}</h3>
                     <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Fecha:</strong> {formatDate(mezcla.creationDate)}</p>
                        <p><strong>Tipo:</strong> {mezcla.tipoMezcla}</p>
                    </div>
                    <div>
                         <h4 className="text-md font-semibold text-foreground mb-2">Viñetas Utilizadas</h4>
                         <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50"><tr><th className="p-2 text-left">No. Viñeta</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-right">Peso Utilizado</th></tr></thead>
                                <tbody>
                                    {mezcla.inputVignettesData.map(v => (
                                        <tr key={v.vignetteId} className="border-t"><td className="p-2 font-semibold text-red-500">{v.vignetteNumber}</td><td className="p-2">{v.tipo}</td><td className="p-2 text-right">{v.pesoUtilizado.toFixed(2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-sm text-muted-foreground">Total Entrada</p><p className="text-xl font-bold text-foreground">{mezcla.totalInputWeight.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Despachado</p><p className="text-xl font-bold text-foreground">{mezcla.cantidadDespachada.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">En Bodega</p><p className={`text-xl font-bold text-green-600`}>{mezcla.sobranteEnBodega.toFixed(2)}</p></div>
                    </div>
                </div>
                 <div className="flex-shrink-0 flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};


export default MezclasPage;