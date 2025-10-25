

import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { PurchaseReceipt, Supplier, ThreshingOrderReceipt, ThreshingOrder, ContractLot, Salida, Exporter } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ReceiptForm from '../components/ReceiptForm';
import ReceiptPDF from '../components/ReceiptPDF';
import EyeIcon from '../components/icons/EyeIcon';
import { printComponent } from '../utils/printUtils';
import ToggleSwitch from '../components/ToggleSwitch';
import { useToast } from '../hooks/useToast';
import { useHighlight } from '../contexts/HighlightContext';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const CalculatedFieldDisplay: React.FC<{ label: string, value: string | number, isPercentage?: boolean, isCurrency?: boolean, className?: string, valueClassName?: string }> = ({ label, value, isPercentage, isCurrency, className = '', valueClassName = '' }) => (
    <div className={className}>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`font-semibold ${valueClassName || 'text-foreground'}`}>
            {typeof value === 'number'
                ? `${isCurrency ? 'Q' : ''}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${isPercentage ? '%' : ''}`
                : value
            }
        </p>
    </div>
);


const ReceiptDetailModal: React.FC<{ receipt: PurchaseReceipt; supplier: Supplier | undefined; onClose: () => void; onGeneratePdf: (receipt: PurchaseReceipt) => void; canViewCosts: boolean; canViewAnalysis: boolean; }> = ({ receipt, supplier, onClose, onGeneratePdf, canViewCosts, canViewAnalysis }) => {
    
    interface UsageHistoryItem {
        orderNumber: string;
        partidas: string;
        amountUsed: number;
    }
    const [usageHistory, setUsageHistory] = useState<UsageHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const diferencia = (receipt.pesoNetoEnvio || 0) - receipt.pesoNeto;

    useEffect(() => {
        const fetchUsageHistory = async () => {
            if (!receipt) return;
            setLoadingHistory(true);
            try {
                const orderReceipts = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', r => r.receiptId === receipt.id);
                if (orderReceipts.length > 0) {
                    const orderIds = orderReceipts.map(or => or.threshingOrderId);
                    
                    const [allOrders, allLots] = await Promise.all([
                        api.getCollection<ThreshingOrder>('threshingOrders', o => orderIds.includes(o.id)),
                        api.getCollection<ContractLot>('contractLots')
                    ]);
                    
                    const history = orderReceipts.map(or => {
                        const order = allOrders.find(o => o.id === or.threshingOrderId);
                        if (!order) return null;

                        const partidas = order.lotIds.map(lotId => allLots.find(l => l.id === lotId)?.partida || 'N/A').join(', ');

                        return {
                            orderNumber: order.orderNumber,
                            partidas: partidas,
                            amountUsed: or.amountToThresh,
                        };
                    }).filter((item): item is UsageHistoryItem => item !== null);
                    
                    setUsageHistory(history);
                } else {
                    setUsageHistory([]);
                }
            } catch(error) {
                console.error("Error fetching usage history:", error);
                setUsageHistory([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchUsageHistory();
    }, [receipt]);
    
    const openPdf = (pdfData: string) => {
        const byteCharacters = atob(pdfData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'application/pdf'});
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                 {receipt.status === 'Anulado' && (
                    <div className="absolute top-6 right-6 bg-red-100 text-red-800 text-sm font-bold px-4 py-2 rounded-lg transform -rotate-6 shadow-md border border-red-200 z-10">
                        ANULADO
                    </div>
                )}
                 <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-xl font-bold text-foreground">Detalle del Recibo: <span className="text-red-600 dark:text-red-500">{receipt.recibo}</span></h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="space-y-6 text-sm">
                    {/* General */}
                    <div className="border-b pb-4">
                        <h4 className="text-lg font-semibold text-blue-600 mb-3">Información General</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CalculatedFieldDisplay label="Fecha" value={formatDate(receipt.fecha)} />
                            <CalculatedFieldDisplay label="Proveedor" value={supplier?.name || 'N/A'} valueClassName="text-blue-600 dark:text-blue-400"/>
                            <CalculatedFieldDisplay label="Placa del Vehículo" value={receipt.placaVehiculo} />
                            <CalculatedFieldDisplay label="Piloto" value={receipt.piloto} />
                            <CalculatedFieldDisplay label="Certificaciones" value={receipt.certificacion.join(', ') || 'N/A'} className="col-span-full"/>
                        </div>
                    </div>
                    {/* Pesos */}
                    <div className="border-b pb-4">
                        <h4 className="text-lg font-semibold text-purple-600 mb-3">Detalle del Café y Pesos</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CalculatedFieldDisplay label="Tipo de Café" value={receipt.tipo === 'Otro' ? receipt.customTipo || receipt.tipo : receipt.tipo} valueClassName="text-green-600 dark:text-green-400"/>
                            <CalculatedFieldDisplay label="Peso Bruto" value={receipt.pesoBruto} />
                            <CalculatedFieldDisplay label="Yute (sacos)" value={receipt.yute} />
                            <CalculatedFieldDisplay label="Nylon (Sacos)" value={receipt.nylon} />
                            <CalculatedFieldDisplay label="Tara" value={receipt.tara} />
                            <CalculatedFieldDisplay label="Peso Neto" value={receipt.pesoNeto} valueClassName="font-bold text-purple-600 dark:text-purple-400" />
                            <CalculatedFieldDisplay label="Peso Neto Envío" value={receipt.pesoNetoEnvio || 0} />
                            <div>
                                <p className="text-sm text-muted-foreground">Diferencia</p>
                                <p className={`font-semibold ${diferencia < -0.005 ? 'text-red-500' : 'text-green-600'}`}>
                                    {diferencia.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                     {/* Analisis */}
                    {canViewAnalysis && (
                        <div className="border-b pb-4">
                            <h4 className="text-lg font-semibold text-teal-600 mb-3">Análisis de Calidad y Rendimiento</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <CalculatedFieldDisplay label="g Muestra" value={receipt.gMuestra} />
                                <CalculatedFieldDisplay label="g Primera" value={receipt.gPrimera} />
                                <CalculatedFieldDisplay label="g Rechazo" value={receipt.gRechazo} />
                                <div />
                                <CalculatedFieldDisplay label="Primera" value={receipt.primera} valueClassName="font-bold text-purple-600 dark:text-purple-400"/>
                                <CalculatedFieldDisplay label="Rechazo" value={receipt.rechazo} valueClassName="font-bold text-purple-600 dark:text-purple-400"/>
                                <CalculatedFieldDisplay label="Total Bruto" value={receipt.totalBruto} valueClassName="font-bold text-purple-600 dark:text-purple-400"/>
                                <div />
                                <CalculatedFieldDisplay label="% Rendimiento Total" value={receipt.rendimientoTotal} isPercentage />
                                <CalculatedFieldDisplay label="% Rendimiento Primera" value={receipt.rendimientoPrimera} isPercentage />
                                <CalculatedFieldDisplay label="% Rendimiento Rechazo" value={receipt.rendimientoRechazo} isPercentage />
                            </div>
                        </div>
                    )}
                     {/* Catacion */}
                     {canViewAnalysis && receipt.cuppingProfile && (
                        <div className="border-b pb-4">
                            <h4 className="text-lg font-semibold text-orange-600 mb-3">Perfil de Catación</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <CalculatedFieldDisplay label="Humedad" value={`${receipt.cuppingProfile.humedad || 0}%`} />
                                <CalculatedFieldDisplay label="Diferencial" value={receipt.cuppingProfile.diferencial || 0} />
                                <CalculatedFieldDisplay label="Nivel de Tueste" value={receipt.cuppingProfile.roastLevel || 'N/A'} />
                                <CalculatedFieldDisplay label="Fecha Catación" value={formatDate(receipt.cuppingProfile.cuppingDate)} />
                                <CalculatedFieldDisplay label="Dictamen" value={receipt.cuppingProfile.dictamen || 'N/A'} className="col-span-2"/>
                                <CalculatedFieldDisplay label="Mezcla" value={receipt.cuppingProfile.mezcla || 'N/A'} className="col-span-2"/>
                                <CalculatedFieldDisplay label="Notas del Catador" value={receipt.cuppingProfile.notes || 'N/A'} className="col-span-full"/>
                            </div>
                        </div>
                     )}
                    {/* Costos */}
                    {canViewCosts && (
                        <div className="border-b pb-4">
                            <h4 className="text-lg font-semibold text-red-600 mb-3">Costos</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <CalculatedFieldDisplay label="Precio (Q)" value={receipt.precio} isCurrency />
                                <CalculatedFieldDisplay label="Total Compra (Q)" value={receipt.totalCompra} isCurrency />
                                <CalculatedFieldDisplay label="Precio Catadura (Q)" value={receipt.precioCatadura} isCurrency />
                                <CalculatedFieldDisplay label="Costo Catadura (Q)" value={receipt.costoCatadura} isCurrency />
                            </div>
                        </div>
                    )}
                     {/* Almacenamiento */}
                     <div className="border-b pb-4">
                        <h4 className="text-lg font-semibold text-indigo-600 mb-3">Almacenamiento</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Trillado</p>
                                <p className="font-bold text-xl text-purple-600 dark:text-purple-400">{Number(receipt.trillado || 0).toFixed(2)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-800">
                                <p className="text-sm text-purple-800 dark:text-purple-300 font-medium">En Bodega</p>
                                <p className="font-bold text-xl text-purple-600 dark:text-purple-400">{Number(receipt.enBodega || 0).toFixed(2)}</p>
                            </div>
                            <CalculatedFieldDisplay label="Notas" value={receipt.notas} className="col-span-full"/>
                        </div>
                    </div>
                     {/* Historial de Uso */}
                     <div>
                        <h4 className="text-lg font-semibold text-gray-600 mb-3">Historial de Uso en Trilla</h4>
                        {loadingHistory ? (
                             <p className="text-muted-foreground">Cargando historial...</p>
                        ) : usageHistory.length > 0 ? (
                            <div className="space-y-3">
                                {usageHistory.map((item, index) => (
                                    <div key={index} className="p-3 rounded-lg bg-muted/50 border border-border">
                                        <p className="font-semibold text-foreground">Orden de Trilla: <span className="text-red-600 dark:text-red-500">{item.orderNumber}</span></p>
                                        <p className="text-sm text-muted-foreground">Partida(s): <span className="text-red-600 dark:text-red-500">{item.partidas}</span></p>
                                        <p className="text-sm">Cantidad Utilizada: <span className="font-bold text-purple-600 dark:text-purple-400">{item.amountUsed.toFixed(2)} qqs.</span></p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Este recibo aún no ha sido utilizado en ninguna orden de trilla.</p>
                        )}
                    </div>
                </div>
                 <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                    {receipt.pdfEnvio && (
                        <button 
                            onClick={() => openPdf(receipt.pdfEnvio!)} 
                            className="px-4 py-2 text-sm font-medium rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                        >
                            Ver PDF Envío
                        </button>
                    )}
                    <button onClick={() => onGeneratePdf(receipt)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted disabled:bg-muted/50 disabled:cursor-not-allowed" disabled={receipt.status === 'Anulado'}>
                        Generar PDF Recibo
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

interface InventorySummaryBarProps {
    receipts: PurchaseReceipt[];
    activeFilter: string | null;
    onFilterChange: (filter: string | null) => void;
}

const InventorySummaryBar: React.FC<InventorySummaryBarProps> = ({ receipts, activeFilter, onFilterChange }) => {
    const summary = useMemo(() => {
        const inventoryMap: Record<string, number> = {};

        receipts.forEach(receipt => {
            if (receipt.status === 'Activo' && receipt.enBodega > 0) {
                const coffeeType = receipt.tipo === 'Otro' && receipt.customTipo ? receipt.customTipo : receipt.tipo;
                if (coffeeType) {
                    inventoryMap[coffeeType] = (inventoryMap[coffeeType] || 0) + receipt.enBodega;
                }
            }
        });
        
        return Object.entries(inventoryMap).map(([type, total]) => ({ type, total }));

    }, [receipts]);

    const getTypeColor = (type: string) => {
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = type.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colors = [
            { active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900' },
            { active: 'bg-green-600 text-white border-green-600', inactive: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900' },
            { active: 'bg-yellow-500 text-black border-yellow-500', inactive: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800 dark:hover:bg-yellow-900' },
            { active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900' },
            { active: 'bg-pink-600 text-white border-pink-600', inactive: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-800 dark:hover:bg-pink-900' },
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
                        </button>
                    );
                })}
                {activeFilter && (
                    <button
                        onClick={() => onFilterChange(null)}
                        className="px-4 py-2 text-sm font-medium rounded-full border border-red-500 text-red-500 bg-red-500/10 hover:bg-red-500/20"
                    >
                        &times; Mostrar Todos
                    </button>
                )}
            </div>
        </div>
    );
};

type SortKey = keyof PurchaseReceipt | 'proveedorName' | 'tipoCafe';
type SortDirection = 'ascending' | 'descending';

const IngresoPage: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.ingreso;
    const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [receiptToEdit, setReceiptToEdit] = useState<PurchaseReceipt | null>(null);
    const [receiptToVoid, setReceiptToVoid] = useState<PurchaseReceipt | null>(null);
    const [receiptToView, setReceiptToView] = useState<PurchaseReceipt | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'fecha', direction: 'descending' });
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [showOnlyInStock, setShowOnlyInStock] = useState(true);
    const { addToast } = useToast();
    const { targetId, clearHighlight } = useHighlight();

    const canViewCosts = permissions?.viewCosts === true;
    const canViewAnalysis = permissions?.viewAnalysis === true;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [receiptsData, suppliersData] = await Promise.all([
                api.getCollection<PurchaseReceipt>('purchaseReceipts'),
                api.getCollection<Supplier>('suppliers')
            ]);
            setReceipts(receiptsData);
            setSuppliers(suppliersData);
        } catch (error) {
            console.error("Error fetching data:", error);
            addToast("Error al cargar los datos de ingresos.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['purchaseReceipts', 'suppliers', 'threshingOrderReceipts'].includes(customEvent.detail.collectionName)) {
                fetchData();
            }
        };
        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
    }, []);
    
    useEffect(() => {
        if (targetId && !loading) {
            const element = document.querySelector(`[data-id="${targetId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-row');
                setTimeout(() => {
                    element.classList.remove('highlight-row');
                }, 4500);
            }
        }
    }, [targetId, receipts, loading]);

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'N/A';

    const processedReceipts = useMemo(() => {
        let sortableItems = receipts.map(r => ({
            ...r,
            proveedorName: getSupplierName(r.proveedorId),
            tipoCafe: r.tipo === 'Otro' ? r.customTipo || '' : r.tipo,
        }));
        
        if (showOnlyInStock) {
            sortableItems = sortableItems.filter(item => item.enBodega > 0.005);
        }

        if (activeFilter) {
            sortableItems = sortableItems.filter(item => item.tipoCafe === activeFilter);
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const getSortValue = (item: any, key: SortKey) => item[key as keyof typeof item];
                
                const aValue = getSortValue(a, sortConfig.key);
                const bValue = getSortValue(b, sortConfig.key);

                if (aValue === undefined || bValue === undefined) return 0;
                
                let comparison = 0;
                if (sortConfig.key === 'fecha') {
                    comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
                } else if (sortConfig.key === 'recibo') {
                    comparison = parseInt(aValue.split('-')[1], 10) - parseInt(bValue.split('-')[1], 10);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                } else {
                    comparison = String(aValue).localeCompare(String(bValue));
                }
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [receipts, suppliers, sortConfig, activeFilter, showOnlyInStock]);


    const handleEdit = (receipt: PurchaseReceipt) => {
        setReceiptToEdit(receipt);
        setShowForm(true);
    };

    const handleVoidClick = (receipt: PurchaseReceipt) => {
        setReceiptToVoid(receipt);
    };

    const confirmVoid = async () => {
        if (!receiptToVoid) return;
        try {
            const [allThreshingOrderReceipts, allSalidas] = await Promise.all([
                api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts'),
                api.getCollection<Salida>('salidas'),
            ]);
    
            const isUsedInThreshing = allThreshingOrderReceipts.some(tor => tor.inputType === 'Recibo' && tor.receiptId === receiptToVoid.id);
            const isUsedInSalida = allSalidas.some(s => s.status === 'Activo' && s.tipoSalida === 'Devolución Recibo' && s.recibos?.some(r => r.reciboId === receiptToVoid.id));
    
            if (isUsedInThreshing || isUsedInSalida) {
                let usedIn = [];
                if (isUsedInThreshing) usedIn.push("una orden de trilla");
                if (isUsedInSalida) usedIn.push("una salida (devolución)");
                addToast(`No se puede anular el recibo '${receiptToVoid.recibo}' porque está siendo utilizado en ${usedIn.join(' y ')}. Anule los procesos posteriores primero.`, 'error');
                setReceiptToVoid(null);
                return;
            }

            await api.updateDocument<PurchaseReceipt>('purchaseReceipts', receiptToVoid.id, { 
                status: 'Anulado',
                enBodega: 0,
                trillado: 0
            });
            addToast(`Recibo ${receiptToVoid.recibo} anulado correctamente.`, "success");
        } catch (error) {
            console.error("Error voiding receipt:", error);
            addToast("Error al anular el recibo.", "error");
        } finally {
            setReceiptToVoid(null);
        }
    };
    
    const handleSaveSuccess = () => {
        setShowForm(false);
        setReceiptToEdit(null);
    };

    const handlePrint = async (receipt: PurchaseReceipt) => {
        const supplier = suppliers.find(s => s.id === receipt.proveedorId);
        if (!supplier) {
            addToast("Proveedor no encontrado, no se puede generar el PDF.", "error");
            return;
        }
        const exporters = await api.getCollection<Exporter>('exporters');
        const dizano = exporters.find(e => e.name === 'Dizano, S.A.');
        printComponent(<ReceiptPDF receipt={receipt} supplier={supplier} exporterLogo={dizano?.logo} />, `Recibo-${receipt.recibo}`);
    };

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: SortKey, label: string, className?: string }> = ({ sortKey, label, className }) => {
        const isSorted = sortConfig?.key === sortKey;
        const icon = isSorted ? (sortConfig?.direction === 'ascending' ? '▲' : '▼') : '';
        return (
            <th className={`px-6 py-3 ${className}`}>
                <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 hover:text-foreground transition-colors">
                    {label}
                    <span className="text-xs">{icon}</span>
                </button>
            </th>
        );
    };

    const getRowClass = (receipt: (typeof processedReceipts)[0]) => {
        if (receipt.status === 'Anulado') {
            return 'bg-red-500/5 text-muted-foreground opacity-60 line-through cursor-not-allowed';
        }
        if (!showOnlyInStock && receipt.enBodega <= 0.005) {
            return 'bg-gray-500/5 text-muted-foreground opacity-70 hover:bg-muted/50 cursor-pointer';
        }
        return 'hover:bg-muted/50 cursor-pointer';
    };


    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Ingreso de Café</h2>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <ToggleSwitch id="showOnlyInStock" checked={showOnlyInStock} onChange={setShowOnlyInStock} />
                        <label htmlFor="showOnlyInStock" className="text-sm font-medium text-muted-foreground select-none">Mostrar solo con inventario</label>
                    </div>
                    {permissions?.add && <button 
                        onClick={() => { setReceiptToEdit(null); setShowForm(true); }} 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <PlusIcon className="w-4 h-4" /> Crear Recibo
                    </button>}
                </div>
            </div>

            <InventorySummaryBar receipts={receipts} activeFilter={activeFilter} onFilterChange={setActiveFilter} />

            <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted whitespace-nowrap">
                        <tr>
                            <SortableHeader sortKey="fecha" label="Fecha" />
                            <SortableHeader sortKey="recibo" label="Recibo" />
                            <SortableHeader sortKey="proveedorName" label="Proveedor" />
                            <SortableHeader sortKey="tipoCafe" label="Tipo de Café" />
                            <th className="px-6 py-3 text-right">Peso Neto</th>
                            <th className="px-6 py-3 text-right">Trillado</th>
                            <th className="px-6 py-3 text-right">En Bodega</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-10">Cargando recibos...</td></tr>
                        ) : processedReceipts.length > 0 ? (
                            processedReceipts.map((receipt) => (
                                <tr key={receipt.id}
                                    data-id={receipt.id}
                                    className={`border-b border-border transition-colors ${getRowClass(receipt)}`} 
                                    onClick={() => receipt.status !== 'Anulado' && setReceiptToView(receipt)}>
                                    <td className="px-6 py-4">{formatDate(receipt.fecha)}</td>
                                    <td className="px-6 py-4 font-medium text-red-600 dark:text-red-500">{receipt.recibo}</td>
                                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400">{receipt.proveedorName}</td>
                                    <td className="px-6 py-4 text-green-600 dark:text-green-400">{receipt.tipoCafe}</td>
                                    <td className="px-6 py-4 text-right font-bold text-purple-600 dark:text-purple-400">{Number(receipt.pesoNeto).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-purple-600 dark:text-purple-400">{Number(receipt.trillado || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-purple-600 dark:text-purple-400">{Number(receipt.enBodega || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                                className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                onClick={(e) => { e.stopPropagation(); setReceiptToView(receipt); }}
                                                title="Ver Detalle">
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            {permissions?.edit && <button 
                                                className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(receipt); }}
                                                disabled={receipt.status === 'Anulado'}
                                                title="Editar Recibo">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>}
                                            {permissions?.delete && <button 
                                                className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                onClick={(e) => { e.stopPropagation(); handleVoidClick(receipt); }}
                                                disabled={receipt.status === 'Anulado' || Number(receipt.trillado || 0) > 0}
                                                title={receipt.status === 'Anulado' ? 'Recibo ya anulado' : (Number(receipt.trillado || 0) > 0 ? 'No se puede anular, ya fue trillado' : 'Anular recibo')}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={8} className="text-center py-10">{activeFilter ? 'No hay recibos que coincidan con el filtro.' : (showOnlyInStock ? 'No hay inventario en bodega.' : 'No hay recibos para mostrar.')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {showForm && (
                <ReceiptForm 
                    existingReceipt={receiptToEdit}
                    suppliers={suppliers}
                    onCancel={() => { setShowForm(false); setReceiptToEdit(null); }}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}

            {receiptToView && (
                <ReceiptDetailModal
                    receipt={receiptToView}
                    supplier={suppliers.find(s => s.id === receiptToView.proveedorId)}
                    onClose={() => setReceiptToView(null)}
                    onGeneratePdf={handlePrint}
                    canViewCosts={canViewCosts}
                    canViewAnalysis={canViewAnalysis}
                />
            )}

            {receiptToVoid && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Anulación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres anular el recibo <strong>{receiptToVoid.recibo}</strong>? Esta acción no se puede deshacer y el número de recibo no podrá ser reutilizado.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setReceiptToVoid(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmVoid} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Anular Recibo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngresoPage;