
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/localStorageManager';
import { Mezcla, Viñeta, Rendimiento, Reproceso, ThreshingOrderReceipt, Salida } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import EyeIcon from '../components/icons/EyeIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import MezclaForm from '../components/MezclaForm';
import { printComponent } from '../utils/printUtils';
import MezclaPDF from '../components/MezclaPDF';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ToggleSwitch from '../components/ToggleSwitch';
import { useToast } from '../hooks/useToast';
import { useHighlight } from '../contexts/HighlightContext';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const StatusBadge: React.FC<{ status: Mezcla['status'] }> = ({ status }) => {
    const statusStyles: Record<Mezcla['status'], string> = {
        'Activo': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Despachado Parcialmente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Agotado': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const style = statusStyles[status] || statusStyles['Agotado'];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>{status}</span>;
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
    const { addToast } = useToast();
    const { targetId, clearHighlight } = useHighlight();

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
        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
    }, []);

    useEffect(() => {
        if (targetId) {
            const element = document.querySelector(`[data-id="${targetId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-row');
                setTimeout(() => {
                    element.classList.remove('highlight-row');
                    clearHighlight();
                }, 4500);
            } else {
                clearHighlight();
            }
        }
    }, [targetId, mezclas, loading]);

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
            // Deletion Lock Check
            const [allThreshingOrderReceipts, allSalidas] = await Promise.all([
                api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts'),
                api.getCollection<Salida>('salidas')
            ]);
    
            const isUsedInThreshing = allThreshingOrderReceipts.some(tor => tor.inputType === 'Mezcla' && tor.receiptId === mezclaToDelete.id);
            const isUsedInSalida = allSalidas.some(s => s.status === 'Activo' && s.mezclas?.some(m => m.mezclaId === mezclaToDelete.id));
    
            if (isUsedInThreshing || isUsedInSalida) {
              let usedIn = [];
              if (isUsedInThreshing) usedIn.push("órdenes de trilla");
              if (isUsedInSalida) usedIn.push("salidas");
              addToast(`No se puede eliminar la mezcla '${mezclaToDelete.mezclaNumber}' porque está siendo utilizada en ${usedIn.join(' y ')}. Anule los procesos posteriores primero.`, 'error');
              setMezclaToDelete(null);
              return;
            }

            // Proceed with deletion if not locked
            const updatePromises: Promise<any>[] = [];
            const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const allReprocesos = await api.getCollection<Reproceso>('reprocesos');

            for (const usedVignette of mezclaToDelete.inputVignettesData) {
                const { vignetteId, pesoUtilizado } = usedVignette;

                let parentDoc: Rendimiento | Reproceso | undefined;
                let collectionName: 'rendimientos' | 'reprocesos' | undefined;
                let vignetteArrayKey: 'vignettes' | 'outputVignettes' | undefined;

                parentDoc = allRendimientos.find(r => r.vignettes.some(v => v.id === vignetteId));
                if (parentDoc) {
                    collectionName = 'rendimientos';
                    vignetteArrayKey = 'vignettes';
                } else {
                    parentDoc = allReprocesos.find(r => r.outputVignettes.some(v => v.id === vignetteId));
                    if (parentDoc) {
                        collectionName = 'reprocesos';
                        vignetteArrayKey = 'outputVignettes';
                    }
                }

                if (parentDoc && collectionName && vignetteArrayKey) {
                    const updatedVignettes = (parentDoc[vignetteArrayKey] as Viñeta[]).map(v => {
                        if (v.id === vignetteId) {
                            const newPesoNeto = (Number(v.pesoNeto) || 0) + pesoUtilizado;
                            const newStatus: Viñeta['status'] = Math.abs(newPesoNeto - (v.originalPesoNeto || 0)) < 0.005 ? 'En Bodega' : 'Mezclada Parcialmente';
                            return { ...v, pesoNeto: newPesoNeto, status: newStatus };
                        }
                        return v;
                    });
                    updatePromises.push(api.updateDocument(collectionName, parentDoc.id, { [vignetteArrayKey]: updatedVignettes }));
                }
            }

            await Promise.all(updatePromises);
            await api.deleteDocument('mezclas', mezclaToDelete.id);
            setMezclaToDelete(null);
        } catch (error) {
            console.error("Error deleting mezcla:", error);
            addToast("No se pudo eliminar la mezcla.", 'error');
            setMezclaToDelete(null);
        }
    };
    
    const handlePrint = (mezcla: Mezcla) => {
        printComponent(<MezclaPDF mezcla={mezcla} />, `Mezcla-${mezcla.mezclaNumber}`);
    };

    const filteredMezclas = useMemo(() => {
        if (showOnlyInStock) {
            return mezclas.filter(m => m.status === 'Activo' || m.status === 'Despachado Parcialmente');
        }
        return mezclas;
    }, [mezclas, showOnlyInStock]);

    if (view === 'form') {
        return <MezclaForm 
            existingMezcla={mezclaToEdit} 
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
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-10">Cargando mezclas...</td></tr>
                        ) : filteredMezclas.length > 0 ? (
                            filteredMezclas.map(mezcla => (
                                <tr key={mezcla.id} data-id={mezcla.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setMezclaToView(mezcla)}>
                                    <td className="px-6 py-4">{formatDate(mezcla.creationDate)}</td>
                                    <td className="px-6 py-4 font-medium text-purple-600">{mezcla.mezclaNumber}</td>
                                    <td className="px-6 py-4">{mezcla.tipoMezcla}</td>
                                    <td className="px-6 py-4 text-right">{mezcla.totalInputWeight.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">{mezcla.cantidadDespachada.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">{mezcla.sobranteEnBodega.toFixed(2)}</td>
                                    <td className="px-6 py-4"><StatusBadge status={mezcla.status} /></td>
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
                             <tr><td colSpan={8} className="text-center py-10">{showOnlyInStock ? "No hay mezclas con inventario en bodega." : "No hay mezclas creadas."}</td></tr>
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
