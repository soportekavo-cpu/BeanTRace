import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Rendimiento, ThreshingOrder, Viñeta, Reproceso, ByproductType, Contract, ContractLot, Client } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EyeIcon from '../components/icons/EyeIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import RendimientoForm from '../components/RendimientoForm';
import RendimientoDetailModal from '../components/RendimientoDetailModal';
import ReprocesoForm from '../components/ReprocesoForm';
import ReprocesoDetailModal from '../components/ReprocesoDetailModal';
import { printComponent } from '../utils/printUtils';
import RendimientoPDF from '../components/RendimientoPDF';
import ReprocesoPDF from '../components/ReprocesoPDF';
import ToggleSwitch from '../components/ToggleSwitch';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

type RendimientoTab = 'resumen' | 'inventario' | 'reprocesos';

const StatusBadge: React.FC<{ status: Viñeta['status'] }> = ({ status }) => {
    const statusStyles: Record<Viñeta['status'], string> = {
        'En Bodega': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Reprocesado': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Mezclada': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'Mezclada Parcialmente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Utilizada en Trilla': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Vendido': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const style = statusStyles[status] || statusStyles['Vendido'];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>{status}</span>;
};

interface VignetteInventorySummaryBarProps {
    vignettes: Viñeta[];
    activeFilter: string | null;
    onFilterChange: (filter: string | null) => void;
}

const VignetteInventorySummaryBar: React.FC<VignetteInventorySummaryBarProps> = ({ vignettes, activeFilter, onFilterChange }) => {
    const summary = useMemo(() => {
        const inventoryMap: Record<string, { total: number; count: number }> = {};

        vignettes.forEach(vignette => {
            if (vignette.status === 'En Bodega' || vignette.status === 'Mezclada Parcialmente') {
                if (!inventoryMap[vignette.tipo]) {
                    inventoryMap[vignette.tipo] = { total: 0, count: 0 };
                }
                inventoryMap[vignette.tipo].total += vignette.pesoNeto;
                inventoryMap[vignette.tipo].count += 1;
            }
        });
        
        return Object.entries(inventoryMap)
            .map(([type, data]) => ({ type, ...data }))
            .sort((a, b) => b.total - a.total);

    }, [vignettes]);

    const getTypeColor = (type: string) => {
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = type.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            { active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900' },
            { active: 'bg-amber-500 text-black border-amber-500', inactive: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900' },
            { active: 'bg-teal-600 text-white border-teal-600', inactive: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-800 dark:hover:bg-teal-900' },
            { active: 'bg-rose-600 text-white border-rose-600', inactive: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900' },
            { active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900' },
        ];
        return colors[Math.abs(hash % colors.length)];
    };

    if (summary.length === 0) return null;

    return (
        <div className="my-6">
            <h3 className="text-md font-semibold text-foreground mb-3">Inventario Actual en Bodega (qqs.)</h3>
            <div className="flex flex-wrap items-center gap-3">
                {summary.map((item) => {
                    const isActive = activeFilter === item.type;
                    const color = getTypeColor(item.type);
                    const buttonClass = isActive ? color.active : color.inactive;
                    return (
                        <button
                            key={item.type}
                            onClick={() => onFilterChange(isActive ? null : item.type)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
                                isActive ? `${buttonClass} shadow-md` : buttonClass
                            }`}
                        >
                            <span>{item.type}:</span>
                            <span className="font-bold">{item.total.toFixed(2)}</span>
                            <span className="text-xs opacity-70">({item.count})</span>
                        </button>
                    );
                })}
                {activeFilter && (
                    <button
                        onClick={() => onFilterChange(null)}
                        className="px-4 py-2 text-sm font-medium rounded-full border border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500/20"
                    >
                        &times; Limpiar Filtro
                    </button>
                )}
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const RendimientosPage: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.rendimientos;

    const [view, setView] = useState<'list' | 'rendimientoForm' | 'reprocesoForm'>('list');
    const [activeTab, setActiveTab] = useState<RendimientoTab>('resumen');
    
    // Data states
    const [rendimientos, setRendimientos] = useState<Rendimiento[]>([]);
    const [reprocesos, setReprocesos] = useState<Reproceso[]>([]);
    const [threshingOrders, setThreshingOrders] = useState<ThreshingOrder[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [lots, setLots] = useState<ContractLot[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [byproductTypes, setByproductTypes] = useState<ByproductType[]>([]);
    const [loading, setLoading] = useState(true);

    // State for modals and forms
    const [rendimientoToEdit, setRendimientoToEdit] = useState<Rendimiento | null>(null);
    const [rendimientoToView, setRendimientoToView] = useState<Rendimiento | null>(null);
    const [rendimientoToDelete, setRendimientoToDelete] = useState<Rendimiento | null>(null);

    const [reprocesoToEdit, setReprocesoToEdit] = useState<Reproceso | null>(null);
    const [reprocesoToView, setReprocesoToView] = useState<Reproceso | null>(null);
    const [reprocesoToDelete, setReprocesoToDelete] = useState<Reproceso | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                rendimientosData,
                reprocesosData,
                ordersData,
                contractsData,
                lotsData,
                clientsData,
                byproductsData
            ] = await Promise.all([
                api.getCollection<Rendimiento>('rendimientos'),
                api.getCollection<Reproceso>('reprocesos'),
                api.getCollection<ThreshingOrder>('threshingOrders'),
                api.getCollection<Contract>('contracts'),
                api.getCollection<ContractLot>('contractLots'),
                api.getCollection<Client>('clients'),
                api.getCollection<ByproductType>('byproductTypes'),
            ]);
            setRendimientos(rendimientosData.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
            setReprocesos(reprocesosData.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
            setThreshingOrders(ordersData);
            setContracts(contractsData);
            setLots(lotsData);
            setClients(clientsData);
            setByproductTypes(byproductsData);
        } catch (error) {
            console.error("Error fetching rendimientos data:", error);
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

    const handleDeleteReproceso = async (reproceso: Reproceso) => {
        if (!reproceso) return;
    
        try {
            const anyOutputVignetteUsed = reproceso.outputVignettes.some(v => v.status !== 'En Bodega');
            if (anyOutputVignetteUsed) {
                alert('No se puede eliminar este reproceso porque una o más de sus viñetas de salida ya han sido utilizadas. Anule los procesos posteriores primero.');
                setReprocesoToDelete(null);
                return;
            }

            const updateVignettesStatus = async (vignettesToUpdate: Viñeta[], newStatus: Viñeta['status']) => {
                const vignetteIdsToUpdate = new Set(vignettesToUpdate.map(v => v.id));
                if (vignetteIdsToUpdate.size === 0) return;
    
                const [allRendimientos, allReprocesos] = await Promise.all([
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos'),
                ]);
    
                const promises: Promise<any>[] = [];
    
                allRendimientos.forEach(r => {
                    let wasModified = false;
                    const updatedVignettes = r.vignettes.map(v => {
                        if (vignetteIdsToUpdate.has(v.id)) {
                            wasModified = true;
                            return { ...v, status: newStatus };
                        }
                        return v;
                    });
                    if (wasModified) {
                        promises.push(api.updateDocument<Rendimiento>('rendimientos', r.id, { vignettes: updatedVignettes }));
                    }
                });
    
                allReprocesos.forEach(r => {
                    if (r.id === reproceso.id) return; // Don't check the one we're deleting
                    let wasModified = false;
                    const updatedVignettes = r.outputVignettes.map(v => {
                        if (vignetteIdsToUpdate.has(v.id)) {
                            wasModified = true;
                            return { ...v, status: newStatus };
                        }
                        return v;
                    });
                    if (wasModified) {
                        promises.push(api.updateDocument<Reproceso>('reprocesos', r.id, { outputVignettes: updatedVignettes }));
                    }
                });
    
                await Promise.all(promises);
            };
            
            // Revert input vignettes to 'En Bodega'
            await updateVignettesStatus(reproceso.inputVignettesData, 'En Bodega');
            
            // Delete the Reproceso document
            await api.deleteDocument('reprocesos', reproceso.id);
    
            setReprocesoToDelete(null);
            fetchData();
        } catch (error) {
            console.error("Error deleting reproceso:", error);
            alert("No se pudo eliminar el reproceso.");
        }
    };


    const handleSaveSuccess = () => {
        setView('list');
        setRendimientoToEdit(null);
        setReprocesoToEdit(null);
        fetchData(); // Refetch to ensure all lists are up to date
    };

    const handleCancel = () => {
        setView('list');
        setRendimientoToEdit(null);
        setReprocesoToEdit(null);
    };

    const TabButton: React.FC<{ tab: RendimientoTab; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
        </button>
    );

    // --- RENDER LOGIC ---
    if (view === 'rendimientoForm') {
        return <RendimientoForm existingRendimiento={rendimientoToEdit} onCancel={handleCancel} onSaveSuccess={handleSaveSuccess} />;
    }
    if (view === 'reprocesoForm') {
        return <ReprocesoForm existingReproceso={reprocesoToEdit} onCancel={handleCancel} onSaveSuccess={handleSaveSuccess} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Rendimientos y Subproductos</h2>
            </div>
            <div className="bg-card border border-border rounded-lg shadow-sm">
                <div className="border-b border-border px-6">
                    <nav className="flex space-x-4 -mb-px">
                        <TabButton tab="resumen" label="Resumen de Rendimientos" />
                        <TabButton tab="inventario" label="Inventario de Viñetas" />
                        <TabButton tab="reprocesos" label="Reprocesos" />
                    </nav>
                </div>
                <div className="p-6">
                    {loading ? (
                        <p>Cargando datos...</p>
                    ) : (
                        <>
                            {activeTab === 'resumen' && <ResumenRendimientosTab rendimientos={rendimientos} threshingOrders={threshingOrders} setView={setView} setItemToEdit={setRendimientoToEdit} setItemToView={setRendimientoToView} setItemToDelete={setRendimientoToDelete} permissions={permissions} />}
                            {activeTab === 'inventario' && <InventarioVignettesTab rendimientos={rendimientos} reprocesos={reprocesos} threshingOrders={threshingOrders} contracts={contracts} lots={lots} clients={clients} byproductTypes={byproductTypes} />}
                            {activeTab === 'reprocesos' && <ReprocesosTab reprocesos={reprocesos} setView={setView} setItemToEdit={setReprocesoToEdit} setItemToView={setReprocesoToView} setItemToDelete={setReprocesoToDelete} permissions={permissions} />}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {rendimientoToView && <RendimientoDetailModal rendimiento={rendimientoToView} threshingOrders={threshingOrders} onClose={() => setRendimientoToView(null)} />}
            {rendimientoToDelete && <ConfirmDeleteModal type="Rendimiento" item={rendimientoToDelete} onCancel={() => setRendimientoToDelete(null)} onConfirm={() => { api.deleteDocument('rendimientos', rendimientoToDelete!.id); setRendimientoToDelete(null); }} />}
            {reprocesoToView && <ReprocesoDetailModal reproceso={reprocesoToView} onClose={() => setReprocesoToView(null)} />}
            {reprocesoToDelete && <ConfirmDeleteModal type="Reproceso" item={reprocesoToDelete} onCancel={() => setReprocesoToDelete(null)} onConfirm={() => handleDeleteReproceso(reprocesoToDelete)} />}
        </div>
    );
};

// --- TAB COMPONENTS ---

const ResumenRendimientosTab: React.FC<any> = ({ rendimientos, threshingOrders, setView, setItemToEdit, setItemToView, setItemToDelete, permissions }) => {
    
    const handlePrintClick = (e: React.MouseEvent, item: Rendimiento) => {
        e.stopPropagation();
        const relatedOrders = threshingOrders.filter((o: ThreshingOrder) => item.threshingOrderIds.includes(o.id));
        printComponent(<RendimientoPDF rendimiento={item} threshingOrders={relatedOrders} />, `Rendimiento-${item.rendimientoNumber}`);
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                {permissions?.add && <button onClick={() => { setItemToEdit(null); setView('rendimientoForm'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"><PlusIcon className="w-4 h-4" /> Crear Rendimiento</button>}
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted whitespace-nowrap">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha</th>
                            <th scope="col" className="px-6 py-3">No. Rendimiento</th>
                            <th scope="col" className="px-6 py-3">Órdenes Liquidadas</th>
                            <th scope="col" className="px-6 py-3 text-right">Primeras Proyectadas</th>
                            <th scope="col" className="px-6 py-3 text-right">Primeras Reales</th>
                            <th scope="col" className="px-6 py-3 text-right">Diferencia</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rendimientos.map((item: Rendimiento) => {
                                const difference = item.totalRealPrimeras - item.totalProyectadoPrimeras;
                                const orderNumbers = item.threshingOrderIds.map(id => threshingOrders.find((o: ThreshingOrder) => o.id === id)?.orderNumber || id).join(', ');
                                return (
                                <tr key={item.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setItemToView(item)}>
                                    <td className="px-6 py-4">{formatDate(item.creationDate)}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{item.rendimientoNumber}</td>
                                    <td className="px-6 py-4">{orderNumbers}</td>
                                    <td className="px-6 py-4 text-right">{item.totalProyectadoPrimeras.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">{item.totalRealPrimeras.toFixed(2)}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${difference < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{difference.toFixed(2)}</td>
                                    <td className="px-6 py-4"><div className="flex items-center justify-center gap-4">
                                        <button className="text-blue-500 hover:text-blue-700" title="Ver Detalle"><EyeIcon className="w-5 h-5" /></button>
                                        {permissions?.edit && <button className="text-yellow-500 hover:text-yellow-700" title="Editar" onClick={(e) => { e.stopPropagation(); setItemToEdit(item); setView('rendimientoForm');}}><PencilIcon className="w-4 h-4" /></button>}
                                        <button className="text-gray-500 hover:text-gray-700" title="Imprimir" onClick={(e) => handlePrintClick(e, item)}><PrinterIcon className="w-4 h-4" /></button>
                                        {permissions?.delete && <button className="text-red-500 hover:text-red-700" title="Anular" onClick={(e) => { e.stopPropagation(); setItemToDelete(item);}}><TrashIcon className="w-4 h-4" /></button>}
                                    </div></td>
                                </tr>
                            )})}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const ReprocesosTab: React.FC<any> = ({ reprocesos, setView, setItemToEdit, setItemToView, setItemToDelete, permissions }) => {

    const handlePrintClick = (e: React.MouseEvent, item: Reproceso) => {
        e.stopPropagation();
        printComponent(<ReprocesoPDF reproceso={item} />, `Reproceso-${item.reprocesoNumber}`);
    };
    
    return (
        <div>
            <div className="flex justify-end mb-4">
                {permissions?.add && <button onClick={() => { setItemToEdit(null); setView('reprocesoForm'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"><PlusIcon className="w-4 h-4" /> Crear Reproceso</button>}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs uppercase bg-muted"><tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">No. Reproceso</th><th className="px-6 py-3 text-right">Peso Entrada</th><th className="px-6 py-3 text-right">Peso Salida</th><th className="px-6 py-3 text-right">Merma</th><th className="px-6 py-3 text-center">Acciones</th></tr></thead>
                    <tbody>
                        {reprocesos.map((item: Reproceso) => (
                             <tr key={item.id} className={`border-b hover:bg-muted/50 cursor-pointer ${item.status === 'Anulado' ? 'bg-red-500/10 text-muted-foreground line-through' : ''}`} onClick={() => setItemToView(item)}>
                                <td className="px-6 py-4">{formatDate(item.creationDate)}</td>
                                <td className="px-6 py-4 font-semibold text-purple-600">{item.reprocesoNumber}</td>
                                <td className="px-6 py-4 text-right">{item.totalInputWeight.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right">{item.totalOutputWeight.toFixed(2)}</td>
                                <td className={`px-6 py-4 text-right font-bold ${item.merma > 0.005 ? 'text-red-500' : 'text-green-600'}`}>{item.merma.toFixed(2)}</td>
                                <td className="px-6 py-4"><div className="flex items-center justify-center gap-4">
                                    <button className="text-blue-500 hover:text-blue-700" title="Ver Detalle"><EyeIcon className="w-5 h-5" /></button>
                                    {permissions?.edit && <button disabled={item.status === 'Anulado'} className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400" title="Editar" onClick={(e) => { e.stopPropagation(); setItemToEdit(item); setView('reprocesoForm');}}><PencilIcon className="w-4 h-4" /></button>}
                                    <button disabled={item.status === 'Anulado'} className="text-gray-500 hover:text-gray-700 disabled:text-gray-400" title="Imprimir" onClick={(e) => handlePrintClick(e, item)}><PrinterIcon className="w-4 h-4" /></button>
                                    {permissions?.delete && <button disabled={item.status === 'Anulado'} className="text-red-500 hover:text-red-700 disabled:text-gray-400" title="Eliminar" onClick={(e) => { e.stopPropagation(); setItemToDelete(item);}}><TrashIcon className="w-4 h-4" /></button>}
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const InventarioVignettesTab: React.FC<any> = ({ rendimientos, reprocesos, threshingOrders, contracts, lots, clients, byproductTypes }) => {
    const [filterType, setFilterType] = useState<string | null>(null);
    type SortKey = 'creationDate' | 'numeroViñeta' | 'tipo' | 'originalPesoNeto' | 'pesoNeto' | 'status';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'creationDate', direction: 'desc' });
    const [selectedVignette, setSelectedVignette] = useState<any | null>(null);
    const [showOnlyInStock, setShowOnlyInStock] = useState(true);

    const allVignettes = useMemo(() => {
        const vignettesFromRendimientos = rendimientos.flatMap((r: Rendimiento) => r.vignettes.map(v => ({
            ...v,
            originType: 'Rendimiento',
            originId: r.id,
            rendimientoNumber: r.rendimientoNumber,
            creationDate: r.creationDate,
            threshingOrderIds: r.threshingOrderIds,
        })));
        const vignettesFromReprocesos = reprocesos.flatMap((r: Reproceso) => r.outputVignettes.map(v => ({
            ...v,
            originType: 'Reproceso',
            originId: r.id,
            reprocesoNumber: r.reprocesoNumber,
            creationDate: r.creationDate,
            originVignettes: r.inputVignettesData.map(iv => iv.numeroViñeta).join(', ')
        })));

        const combined = [...vignettesFromRendimientos, ...vignettesFromReprocesos];
        
        return combined.map(v => {
            if (v.originType === 'Rendimiento') {
                const order = threshingOrders.find((o: ThreshingOrder) => o.id && v.threshingOrderIds.includes(o.id));
                if(order) {
                    if (order.orderType === 'Exportación' && order.contractId) {
                         const contract = contracts.find((c: Contract) => c.id === order.contractId);
                         const lot = lots.find((l: ContractLot) => l.id && order.lotIds.includes(l.id));
                         return {...v, orderNumber: order.orderNumber, contract, lot};
                    } else if (order.orderType === 'Venta Local' && order.clientId) {
                        const client = clients.find((c: Client) => c.id === order.clientId);
                        return {...v, orderNumber: order.orderNumber, client, localSaleInfo: order};
                    }
                    return {...v, orderNumber: order.orderNumber };
                }
            }
            return v;
        });

    }, [rendimientos, reprocesos, threshingOrders, contracts, lots, clients]);

    const filteredAndSortedVignettes = useMemo(() => {
        let items = [...allVignettes];
        if (showOnlyInStock) {
            items = items.filter(v => v.status === 'En Bodega' || v.status === 'Mezclada Parcialmente');
        }
        if (filterType) {
            items = items.filter(v => v.tipo === filterType);
        }
        items.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return items;
    }, [allVignettes, filterType, sortConfig, showOnlyInStock]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const downloadCSV = () => {
        const headers = ["Fecha", "No. Viñeta", "Tipo", "Peso Original (qqs.)", "Peso Usado (qqs.)", "Peso Actual (qqs.)", "Estado", "Notas", "Origen", "No. Origen", "Orden de Trilla", "Contrato/Cliente"];
        const rows = filteredAndSortedVignettes.map(v => {
            const origen = v.originType;
            const noOrigen = v.rendimientoNumber || v.reprocesoNumber;
            const ordenTrilla = v.orderNumber || 'N/A';
            const contratoCliente = v.contract?.contractNumber || v.client?.name || 'N/A';
            const pesoOriginal = v.originalPesoNeto || v.pesoNeto;
            const pesoUsado = Number(pesoOriginal) - Number(v.pesoNeto);
            // FIX: Cast to Number to ensure toFixed method is available
            return [
                formatDate(v.creationDate),
                `"${v.numeroViñeta}"`,
                v.tipo,
                Number(pesoOriginal).toFixed(2),
                Number(pesoUsado).toFixed(2),
                Number(v.pesoNeto).toFixed(2),
                v.status,
                `"${v.notas || ''}"`,
                origen,
                noOrigen,
                ordenTrilla,
                `"${contratoCliente}"`,
            ].join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventario_vinetas_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const SortableHeader: React.FC<{ sortKey: SortKey; label: string; className?: string; }> = ({ sortKey, label, className }) => {
        const isSorted = sortConfig.key === sortKey;
        const icon = isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕';
        return (<th className={`p-2 cursor-pointer ${className}`} onClick={() => handleSort(sortKey)}>{label} <span className="text-muted-foreground">{icon}</span></th>);
    };

    return (
        <div>
            <VignetteInventorySummaryBar vignettes={allVignettes} activeFilter={filterType} onFilterChange={setFilterType} />
            
            <div className="flex flex-wrap items-center justify-end gap-4 mb-4">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <ToggleSwitch id="show-in-stock" checked={showOnlyInStock} onChange={setShowOnlyInStock} />
                        <label htmlFor="show-in-stock" className="text-sm font-medium">Mostrar solo con inventario</label>
                    </div>
                    <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted"><DownloadIcon className="w-4 h-4" /> Descargar CSV</button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 whitespace-nowrap">
                        <tr>
                            <SortableHeader sortKey="creationDate" label="Fecha" />
                            <SortableHeader sortKey="numeroViñeta" label="No. Viñeta" />
                            <SortableHeader sortKey="tipo" label="Tipo" />
                            <SortableHeader sortKey="originalPesoNeto" label="P. Original" className="text-right" />
                            <th className="p-2 text-right font-semibold">P. Usado</th>
                            <SortableHeader sortKey="pesoNeto" label="P. Actual" className="text-right" />
                            <SortableHeader sortKey="status" label="Estado" />
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedVignettes.map(v => {
                            const pesoOriginal = v.originalPesoNeto || v.pesoNeto;
                            const pesoUsado = pesoOriginal - v.pesoNeto;
                            return (
                            <tr key={v.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedVignette(v)}>
                                <td className="p-2 align-middle">{formatDate(v.creationDate)}</td>
                                <td className="p-2 align-middle font-semibold text-red-600">{v.numeroViñeta}</td>
                                <td className="p-2 align-middle">{v.tipo}</td>
                                <td className="p-2 align-middle text-right">{pesoOriginal.toFixed(2)}</td>
                                <td className="p-2 align-middle text-right text-yellow-600">{pesoUsado.toFixed(2)}</td>
                                <td className="p-2 align-middle text-right font-bold text-green-600">{v.pesoNeto.toFixed(2)}</td>
                                <td className="p-2 align-middle">
                                    <StatusBadge status={v.status} />
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>

            {selectedVignette && <TraceabilityModal vignette={selectedVignette} onClose={() => setSelectedVignette(null)} />}
        </div>
    );
};

const TraceabilityModal: React.FC<{ vignette: any; onClose: () => void; }> = ({ vignette, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
        <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-foreground">Trazabilidad de Viñeta: <span className="text-red-600">{vignette.numeroViñeta}</span></h3>
                <button onClick={onClose} className="text-2xl">&times;</button>
            </div>
            <div className="space-y-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">Información de Origen:</p>
                    <p><strong>Tipo de Origen:</strong> {vignette.originType}</p>
                    <p><strong>Documento de Origen:</strong> {vignette.rendimientoNumber || vignette.reprocesoNumber}</p>
                    <p><strong>Fecha de Creación:</strong> {formatDate(vignette.creationDate)}</p>
                </div>
                {vignette.orderNumber && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-semibold">Orden de Trilla Asociada:</p>
                        <p><strong>No. Orden:</strong> {vignette.orderNumber}</p>
                        {vignette.contract && <p><strong>Contrato:</strong> {vignette.contract.contractNumber}</p>}
                        {vignette.client && <p><strong>Cliente:</strong> {vignette.client.name}</p>}
                    </div>
                )}
                 <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-semibold">Información Actual:</p>
                    <p><strong>Tipo:</strong> {vignette.tipo}</p>
                    <p><strong>Peso Original:</strong> {(vignette.originalPesoNeto || vignette.pesoNeto).toFixed(2)} qqs.</p>
                    <p><strong>Peso Actual:</strong> {vignette.pesoNeto.toFixed(2)} qqs.</p>
                    <p><strong>Estado:</strong> <StatusBadge status={vignette.status} /></p>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">Cerrar</button>
            </div>
        </div>
    </div>
);

const ConfirmDeleteModal: React.FC<{
    type: 'Rendimiento' | 'Reproceso';
    item: Rendimiento | Reproceso;
    onCancel: () => void;
    onConfirm: () => void;
}> = ({ type, item, onCancel, onConfirm }) => {
    const number = type === 'Rendimiento' ? (item as Rendimiento).rendimientoNumber : (item as Reproceso).reprocesoNumber;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                <h3 className="text-lg font-bold text-foreground">Confirmar Anulación</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                    ¿Estás seguro de anular el {type.toLowerCase()} <strong>{number}</strong>? Esta acción revertirá el estado de las viñetas involucradas.
                </p>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                        Anular {type}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RendimientosPage;
