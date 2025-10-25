
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/localStorageManager';
import { Salida, Mezcla, PurchaseReceipt, Client, Supplier, Exporter } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import { printComponent } from '../utils/printUtils';
import EyeIcon from '../components/icons/EyeIcon';
import SalidaForm from '../components/SalidaForm';
import SalidaPDF from '../components/SalidaPDF';
import { useHighlight } from '../contexts/HighlightContext';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

type SalidaTab = 'mezclas' | 'recibos';

const SalidasPage: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.salidas;
    const [activeTab, setActiveTab] = useState<SalidaTab>('mezclas');
    const [view, setView] = useState<'list' | 'form'>('list');
    
    const [salidas, setSalidas] = useState<Salida[]>([]);
    const [loading, setLoading] = useState(true);

    const [salidaToEdit, setSalidaToEdit] = useState<Salida | null>(null);
    const [salidaToView, setSalidaToView] = useState<Salida | null>(null);
    const [salidaToVoid, setSalidaToVoid] = useState<Salida | null>(null);
    const { targetId, highlightTab, clearHighlight } = useHighlight();


    const fetchData = async () => {
        setLoading(true);
        try {
            const salidasData = await api.getCollection<Salida>('salidas');
            setSalidas(salidasData.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
        } catch (error) {
            console.error("Error fetching salidas:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        const handleDataChange = () => fetchData();
        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
    }, []);

    useEffect(() => {
        if (highlightTab) {
            setActiveTab(highlightTab as SalidaTab);
        }
    }, [highlightTab]);

    useEffect(() => {
        if (targetId && !loading) {
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
    }, [targetId, salidas, loading, activeTab]);

    const handleSaveSuccess = () => {
        setView('list');
        setSalidaToEdit(null);
    };

    const handleEditClick = (e: React.MouseEvent, salida: Salida) => {
        e.stopPropagation();
        setSalidaToEdit(salida);
        setActiveTab(salida.tipoSalida === 'Mezcla' ? 'mezclas' : 'recibos');
        setView('form');
    }
    
    const confirmVoid = async () => {
        if (!salidaToVoid) return;
        try {
            if (salidaToVoid.tipoSalida === 'Mezcla' && salidaToVoid.mezclas) {
                for (const mezclaInfo of salidaToVoid.mezclas) {
                    const mezcla = await api.getCollection<Mezcla>('mezclas', m => m.id === mezclaInfo.mezclaId).then(res => res[0]);
                    if (mezcla) {
                        await api.updateDocument<Mezcla>('mezclas', mezcla.id, {
                            cantidadDespachada: mezcla.cantidadDespachada - mezclaInfo.pesoUtilizado,
                            sobranteEnBodega: mezcla.sobranteEnBodega + mezclaInfo.pesoUtilizado,
                        });
                    }
                }
            } else if (salidaToVoid.tipoSalida === 'Devolución Recibo' && salidaToVoid.recibos) {
                for (const reciboInfo of salidaToVoid.recibos) {
                    const recibo = await api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.id === reciboInfo.reciboId).then(res => res[0]);
                    if (recibo) {
                        await api.updateDocument<PurchaseReceipt>('purchaseReceipts', recibo.id, {
                            devuelto: (recibo.devuelto || 0) - reciboInfo.pesoDevuelto,
                            enBodega: recibo.enBodega + reciboInfo.pesoDevuelto,
                        });
                    }
                }
            }
            await api.updateDocument<Salida>('salidas', salidaToVoid.id, { status: 'Anulado' });
        } catch (error) {
            console.error("Error voiding salida:", error);
        } finally {
            setSalidaToVoid(null);
        }
    };
    
    const handlePrintClick = async (e: React.MouseEvent, salida: Salida) => {
        e.stopPropagation();
        const exporters = await api.getCollection<Exporter>('exporters');
        const dizano = exporters.find(e => e.name === 'Dizano, S.A.');
        printComponent(<SalidaPDF salida={salida} exporterLogo={dizano?.logo} />, `Envio-${salida.salidaNumber}`);
    }

    const filteredSalidas = useMemo(() => {
        return salidas.filter(s => {
            if (activeTab === 'mezclas') return s.tipoSalida === 'Mezcla';
            if (activeTab === 'recibos') return s.tipoSalida === 'Devolución Recibo';
            return false;
        });
    }, [salidas, activeTab]);

    const TabButton: React.FC<{ tab: SalidaTab; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
        </button>
    );
    
    if (view === 'form') {
        return <SalidaForm 
            existingSalida={salidaToEdit}
            tipoSalida={activeTab} 
            onCancel={() => { setView('list'); setSalidaToEdit(null); }} 
            onSaveSuccess={handleSaveSuccess} 
        />;
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Gestión de Salidas</h2>
                {permissions?.add && <button onClick={() => { setSalidaToEdit(null); setView('form'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" /> Registrar Nueva Salida
                </button>}
            </div>

            <div className="border-b border-border">
                <nav className="flex space-x-4 -mb-px">
                    <TabButton tab="mezclas" label="Salida de Mezclas" />
                    <TabButton tab="recibos" label="Devolución de Recibos" />
                </nav>
            </div>
            
             <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted whitespace-nowrap">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha</th>
                            <th scope="col" className="px-6 py-3">No. Envío</th>
                            <th scope="col" className="px-6 py-3">Producto(s)</th>
                            <th scope="col" className="px-6 py-3">Destino</th>
                            <th scope="col" className="px-6 py-3 text-right">Peso Neto (qqs.)</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="text-center py-10">Cargando...</td></tr>
                        ) : filteredSalidas.length > 0 ? (
                            filteredSalidas.map(salida => {
                                const isVoided = salida.status === 'Anulado';
                                const productDescription = salida.tipoSalida === 'Mezcla' 
                                    ? salida.mezclas?.map(m => m.mezclaNumber).join(', ') 
                                    : salida.recibos?.map(r => r.reciboNumber).join(', ');
                                return (
                                <tr key={salida.id} data-id={salida.id} className={`border-b border-border hover:bg-muted/50 cursor-pointer ${isVoided ? 'bg-red-500/10 text-muted-foreground line-through' : ''}`} onClick={() => setSalidaToView(salida)}>
                                    <td className="px-6 py-4">{formatDate(salida.fecha)}</td>
                                    <td className="px-6 py-4 font-medium text-purple-600">{salida.salidaNumber}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{productDescription}</td>
                                    <td className="px-6 py-4">{salida.clienteName}</td>
                                    <td className="px-6 py-4 text-right font-bold">{salida.pesoNeto.toFixed(2)}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${isVoided ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>{salida.status}</span></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={(e) => { e.stopPropagation(); setSalidaToView(salida); }} className="text-gray-500 hover:text-gray-700" title="Ver Detalle"><EyeIcon className="w-5 h-5"/></button>
                                            {permissions?.edit && <button onClick={(e) => handleEditClick(e, salida)} disabled={isVoided} className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400"><PencilIcon className="w-4 h-4" /></button>}
                                            <button onClick={(e) => handlePrintClick(e, salida)} disabled={isVoided} className="text-blue-500 hover:text-blue-700 disabled:text-gray-400"><PrinterIcon className="w-4 h-4" /></button>
                                            {permissions?.delete && <button onClick={(e) => { e.stopPropagation(); setSalidaToVoid(salida); }} disabled={isVoided} className="text-red-500 hover:text-red-700 disabled:text-gray-400"><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            )})
                        ) : (
                             <tr><td colSpan={7} className="text-center py-10">No hay salidas registradas para esta categoría.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {salidaToView && <SalidaDetailModal salida={salidaToView} onClose={() => setSalidaToView(null)} />}
            {salidaToVoid && <ConfirmVoidModal salida={salidaToVoid} onCancel={() => setSalidaToVoid(null)} onConfirm={confirmVoid} />}
        </div>
    );
};


const ConfirmVoidModal: React.FC<{salida: Salida, onCancel: () => void, onConfirm: () => void}> = ({ salida, onCancel, onConfirm }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
        <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-foreground">Confirmar Anulación</h3>
            <p className="text-muted-foreground mt-2 text-sm">¿Estás seguro de anular el envío <strong>{salida.salidaNumber}</strong>? El inventario de los productos será revertido.</p>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border">Cancelar</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md">Anular Envío</button>
            </div>
        </div>
    </div>
);

const SalidaDetailModal: React.FC<{ salida: Salida, onClose: () => void }> = ({ salida, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                     <h3 className="text-xl font-bold text-purple-600">Detalle de Salida: {salida.salidaNumber}</h3>
                     <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-6 mt-4">
                    <div>
                        <h4 className="font-semibold text-lg text-blue-600 mb-2">Información General</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                            <p><strong>Fecha:</strong> {formatDate(salida.fecha)}</p>
                            <p><strong>Tipo:</strong> {salida.tipoSalida === 'Mezcla' ? 'Salida de Mezcla' : 'Devolución de Recibo'}</p>
                            <p><strong>Destino:</strong> {salida.clienteName || 'N/A'}</p>
                            <p><strong>Estado:</strong> {salida.status}</p>
                            {salida.isExportacion && (
                                <>
                                    <p><strong>Tipo de Envío:</strong> Exportación</p>
                                    <p><strong>Carta de Porte:</strong> {salida.cartaPorte || 'N/A'}</p>
                                    <p className="col-span-2"><strong>Partida(s):</strong> {salida.partidas || 'N/A'}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-lg text-green-600 mb-2">Transporte</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                            <p><strong>Piloto:</strong> {salida.piloto}</p>
                            <p><strong>Placa:</strong> {salida.placaVehiculo}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold text-lg text-orange-600 mb-2">Detalle de Carga</h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    {salida.tipoSalida === 'Mezcla' ? (
                                        <tr>
                                            <th className="p-2 text-left">No. Mezcla</th>
                                            <th className="p-2 text-left">Descripción</th>
                                            <th className="p-2 text-right">Peso (qqs.)</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th className="p-2 text-left">No. Recibo</th>
                                            <th className="p-2 text-left">Proveedor</th>
                                            <th className="p-2 text-left">Tipo de Café</th>
                                            <th className="p-2 text-right">Peso Devuelto (qqs.)</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {salida.tipoSalida === 'Mezcla' ? (
                                        salida.mezclas?.map((m, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2 font-medium">{m.mezclaNumber}</td>
                                                <td className="p-2">{m.descripcionEnvio}</td>
                                                <td className="p-2 text-right">{m.pesoUtilizado.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        salida.recibos?.map((r, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="p-2 font-medium">{r.reciboNumber}</td>
                                                <td className="p-2">{r.proveedorName}</td>
                                                <td className="p-2">{r.tipoCafe}</td>
                                                <td className="p-2 text-right">{r.pesoDevuelto.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-lg text-purple-600 mb-2">Resumen de Pesos</h4>
                        <div className="grid grid-cols-4 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                            <p><strong>Sacos Yute:</strong> {salida.sacosYute}</p>
                            <p><strong>Sacos Nylon:</strong> {salida.sacosNylon}</p>
                            <p><strong>Tara:</strong> {salida.tara.toFixed(2)}</p>
                            <p><strong>Peso Bruto:</strong> {salida.pesoBruto.toFixed(2)}</p>
                            <p className="col-span-full font-bold text-lg text-green-600">Peso Neto Total: {salida.pesoNeto.toFixed(2)} qqs.</p>
                        </div>
                    </div>

                    {salida.notas && (
                        <div>
                             <h4 className="font-semibold text-lg text-gray-600 mb-2">Notas</h4>
                             <p className="text-sm p-3 bg-muted/50 rounded-md border">{salida.notas}</p>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
export default SalidasPage;