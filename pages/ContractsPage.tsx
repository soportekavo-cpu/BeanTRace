import React, { useState, useEffect, useMemo } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Contract, ContractLot, Exporter, ThreshingOrder, PurchaseReceipt, ThreshingOrderReceipt, PagePermissions } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';
import FilePlusIcon from '../components/icons/FilePlusIcon';
import AddContractLotForm from '../components/AddContractLotForm';
import EditContractForm from '../components/EditContractForm';
import EditContractLotForm from '../components/EditContractLotForm';
import ThreshingOrderForm from '../components/ThreshingOrderForm';
import PrinterIcon from '../components/icons/PrinterIcon';
import ThreshingOrderDetailModal from '../components/ThreshingOrderDetailModal';
import ThreshingOrderPDF from '../components/ThreshingOrderPDF';
import { printComponent } from '../utils/printUtils';
import { useAuth } from '../contexts/AuthContext';
import EditThreshingOrderForm from '../components/EditThreshingOrderForm';


const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const LotDetailModal: React.FC<{ lot: ContractLot; onClose: () => void }> = ({ lot, onClose }) => {
    return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
        <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold text-foreground">Detalle de Partida: <span className="text-green-600">{lot.partida}</span></h3>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-6 text-sm">
                {/* Main Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><p className="text-muted-foreground">No. Bultos</p><p className="font-medium text-foreground">{lot.bultos}</p></div>
                    <div><p className="text-muted-foreground">Empaque</p><p className="font-medium text-foreground">{lot.empaque}</p></div>
                    <div><p className="text-muted-foreground">Peso Kg.</p><p className="font-medium text-foreground">{lot.pesoKg.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Peso qqs.</p><p className="font-medium text-foreground">{lot.pesoQqs.toFixed(2)}</p></div>
                </div>
                 {/* Pricing */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div><p className="text-muted-foreground">Fijación ($)</p><p className="font-medium text-foreground">${lot.fijacion.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Fecha Fijación</p><p className="font-medium text-foreground">{formatDate(lot.fechaFijacion)}</p></div>
                    <div><p className="text-muted-foreground">Precio Final</p><p className="font-medium text-foreground">${lot.precioFinal.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Valor Cobro</p><p className="font-bold text-lg text-green-600">${lot.valorCobro.toFixed(2)}</p></div>
                </div>
                {/* Sample */}
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div><p className="text-muted-foreground">Guía Muestra</p><p className="font-medium text-foreground">{lot.guiaMuestra || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Fecha Envío Muestra</p><p className="font-medium text-foreground">{formatDate(lot.fechaEnvioMuestra)}</p></div>
                    <div><p className="text-muted-foreground">Muestra Aprobada</p><p className={`font-medium ${lot.muestraAprobada ? 'text-green-500' : 'text-yellow-500'}`}>{lot.muestraAprobada ? 'Sí' : 'No'}</p></div>
                </div>
                {/* Shipping */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div><p className="text-muted-foreground">Destino</p><p className="font-medium text-foreground">{lot.destino || 'N/A'}</p></div>
                     {lot.isf && <div><p className="text-muted-foreground">ISF Requerido</p><p className="font-bold text-red-500">Sí</p></div>}
                     {lot.isf && <div><p className="text-muted-foreground">ISF Enviado</p><p className={`font-medium ${lot.isfSent ? 'text-green-500' : 'text-yellow-500'}`}>{lot.isfSent ? 'Sí' : 'No'}</p></div>}
                    <div><p className="text-muted-foreground">Booking</p><p className="font-medium text-foreground">{lot.booking || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Naviera</p><p className="font-medium text-foreground">{lot.naviera || 'N/A'}</p></div>
                </div>
            </div>
        </div>
    </div>
)};

const AlertIcon: React.FC<{ type: 'triangle' | 'dot', color: string, isPulsing?: boolean }> = ({ type, color, isPulsing }) => {
    const pulseClass = isPulsing ? 'animate-pulse-opacity' : '';
    if (type === 'triangle') {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" className={`flex-shrink-0 ${pulseClass}`}>
                <path d="M12 2L2 22h20L12 2z" fill={color} />
            </svg>
        );
    }
    return <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0`} style={{ backgroundColor: color }}></div>;
};

const AlertsBar: React.FC<{ lots: ContractLot[], threshingOrders: ThreshingOrder[], contractQqs: number }> = ({ lots, threshingOrders, contractQqs }) => {
    const alerts = useMemo(() => {
        if (!lots) return [];
        const activeAlerts: { text: string, icon: React.ReactNode, colorClass: string, pulse: boolean }[] = [];

        // Threshing Alert
        const totalProducedPrimeras = threshingOrders.reduce((sum, order) => sum + order.totalPrimeras, 0);
        const missingQqsForCompletion = contractQqs - totalProducedPrimeras;
        if (missingQqsForCompletion > 0.01) {
            activeAlerts.push({
                text: `Faltan ${missingQqsForCompletion.toFixed(2)} qqs. para completar el contrato`,
                icon: <AlertIcon type="triangle" color="orange" />,
                colorClass: 'border-orange-500 text-orange-600 dark:text-orange-400',
                pulse: false,
            });
        }
        
        // Fixation Alert
        const pendingFixationLots = lots.filter(l => !l.fijacion || l.fijacion === 0);
        if (pendingFixationLots.length > 0) {
            const lotNumbers = pendingFixationLots.map(l => l.partida.split('/').pop()).join(', ');
            const plural = pendingFixationLots.length > 1 ? 's' : '';
            activeAlerts.push({
                text: `Partida${plural} ${lotNumbers} sin fijación`,
                icon: <AlertIcon type="triangle" color="red" isPulsing />,
                colorClass: 'border-red-500 text-red-600 dark:text-red-400',
                pulse: true,
            });
        }

        // Sample Approval Alert
        const pendingSampleLots = lots.filter(l => !l.muestraAprobada);
        if (pendingSampleLots.length > 0) {
            const lotNumbers = pendingSampleLots.map(l => l.partida.split('/').pop()).join(', ');
            const plural = pendingSampleLots.length > 1 ? 's' : '';
            activeAlerts.push({
                text: `Partida${plural} ${lotNumbers} sin muestra aprobada`,
                icon: <AlertIcon type="triangle" color="orange" />, 
                colorClass: 'border-orange-500 text-orange-600 dark:text-orange-400',
                pulse: false,
            });
        }

        // ISF Alert
        const missingIsfSentLots = lots.filter(l => l.isf && !l.isfSent);
        if (missingIsfSentLots.length > 0) {
            const lotNumbers = missingIsfSentLots.map(l => l.partida.split('/').pop()).join(', ');
            const plural = missingIsfSentLots.length > 1 ? 's' : '';
             activeAlerts.push({
                text: `Partida${plural} ${lotNumbers} con ISF pendiente de envío`,
                icon: <AlertIcon type="dot" color="blue" />,
                colorClass: 'border-blue-500 text-blue-600 dark:text-blue-400',
                pulse: false,
            });
        }
        
        return activeAlerts;
    }, [lots, threshingOrders, contractQqs]);

    if (alerts.length === 0) return null;

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-4">
            <h3 className="text-md font-semibold text-foreground mb-3">Alertas y Avisos</h3>
            <div className="flex flex-wrap gap-3">
                {alerts.map((alert, index) => (
                    <div key={index} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full bg-muted/50 border ${alert.colorClass}`}>
                        {alert.icon}
                        <span>{alert.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ContractDetailView: React.FC<{ contract: Contract; onBack: () => void; contractQqs: number; permissions: PagePermissions | undefined; }> = ({ contract, onBack, contractQqs, permissions }) => {
    const [lots, setLots] = useState<ContractLot[]>([]);
    const [threshingOrders, setThreshingOrders] = useState<ThreshingOrder[]>([]);
    const [allThreshingOrders, setAllThreshingOrders] = useState<ThreshingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporter, setExporter] = useState<Exporter | null>(null);
    const [lotToDelete, setLotToDelete] = useState<ContractLot | null>(null);
    const [lotToEdit, setLotToEdit] = useState<ContractLot | null>(null);
    const [selectedLot, setSelectedLot] = useState<ContractLot | null>(null);
    const [view, setView] = useState<'details' | 'createThreshingOrder' | 'createLot'>('details');
    const [orderToEdit, setOrderToEdit] = useState<ThreshingOrder | null>(null);

    const [orderToView, setOrderToView] = useState<ThreshingOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<ThreshingOrder | null>(null);
    
    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [lotsData, exportersData, ordersData, allOrdersData] = await Promise.all([
                api.getCollection<ContractLot>("contractLots", (lot) => lot.contractId === contract.id),
                api.getCollection<Exporter>('exporters', (exp) => exp.id === contract.exporterId),
                api.getCollection<ThreshingOrder>("threshingOrders", (order) => order.contractId === contract.id),
                api.getCollection<ThreshingOrder>("threshingOrders"),
            ]);
            setLots(lotsData);
            setThreshingOrders(ordersData.sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
            setAllThreshingOrders(allOrdersData);
            if (exportersData.length > 0) setExporter(exportersData[0]);
        } catch (error) {
            console.error("Error fetching contract details: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();

        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['contractLots', 'threshingOrders', 'threshingOrderReceipts', 'purchaseReceipts'].includes(customEvent.detail.collectionName)) {
                fetchDetails();
            }
        };

        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, [contract.id, contract.exporterId]);
    
    const confirmDeleteLot = async () => {
        if (!lotToDelete) return;
        try {
            await api.deleteDocument('contractLots', lotToDelete.id!);
        } catch (error) {
            console.error("Error deleting lot:", error);
        } finally {
            setLotToDelete(null);
        }
    };

    const handleUpdateLot = async (updatedLot: ContractLot) => {
        try {
            await api.updateDocument('contractLots', updatedLot.id!, updatedLot);
        } catch (error) {
            console.error("Error updating lot:", error);
        } finally {
            setLotToEdit(null);
        }
    };
    
    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;
        try {
            const orderReceiptsToDelete = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === orderToDelete.id);
            const receiptIdsToUpdate = [...new Set(orderReceiptsToDelete.map(or => or.receiptId))];

            // First, delete the order and its associated receipts to ensure they aren't counted in recalculation
            const deleteReceiptPromises = orderReceiptsToDelete.map(or => api.deleteDocument('threshingOrderReceipts', or.id!));
            await Promise.all(deleteReceiptPromises);
            await api.deleteDocument('threshingOrders', orderToDelete.id!);
    
            // Then, recalculate inventory for each affected purchase receipt based on the remaining ThreshingOrderReceipts
            const inventoryUpdatePromises = receiptIdsToUpdate.map(async (receiptId) => {
                const receipt = await api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.id === receiptId).then(res => res[0]);
                if (receipt) {
                    const remainingOrderReceipts = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.receiptId === receiptId);
                    const newTrillado = remainingOrderReceipts.reduce((sum, or) => sum + or.amountToThresh, 0);
                    const newEnBodega = receipt.pesoNeto - newTrillado;
                    await api.updateDocument<PurchaseReceipt>('purchaseReceipts', receipt.id, { trillado: newTrillado, enBodega: newEnBodega });
                }
            });
            await Promise.all(inventoryUpdatePromises);
    
        } catch (error) {
            console.error("Error deleting threshing order and reverting inventory:", error);
        } finally {
            setOrderToDelete(null);
        }
    };
    
    const handlePrintOrder = async (order: ThreshingOrder) => {
        try {
            const orderReceipts = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === order.id);
            printComponent(
                <ThreshingOrderPDF order={order} receipts={orderReceipts} contract={contract} lots={lots} />,
                `Orden-Trilla-${order.orderNumber}`
            );
        } catch (e) {
            console.error("Failed to prepare print data for Threshing Order:", e);
            alert("No se pudo generar el PDF para imprimir.");
        }
    };

    if (view === 'createThreshingOrder') {
        return <ThreshingOrderForm contract={contract} contractLots={lots} allThreshingOrders={allThreshingOrders} onCancel={() => setView('details')} onSaveSuccess={() => setView('details')} />
    }

    if (view === 'createLot' && exporter) {
        return <AddContractLotForm 
            contract={contract} 
            exporter={exporter} 
            existingLots={lots} 
            onCancel={() => setView('details')}
            onLotAdded={() => setView('details')}
        />;
    }
    
    if (orderToEdit) {
        return <EditThreshingOrderForm order={orderToEdit} contract={contract} contractLots={lots} allThreshingOrders={allThreshingOrders} onCancel={() => setOrderToEdit(null)} onSaveSuccess={() => setOrderToEdit(null)} />
    }

    return (
        <div className="space-y-8">
            <button onClick={onBack} className="text-sm font-medium text-green-600 hover:underline">
                &larr; Volver a Contratos
            </button>
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-500">Contrato: {contract.contractNumber}</h2>
                        <p className="text-muted-foreground">{contract.buyerName}</p>
                    </div>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-6 text-sm">
                    <div><p className="text-muted-foreground">Exportadora</p><p className="font-medium text-foreground">{contract.exporterName}</p></div>
                    <div><p className="text-muted-foreground">Fecha Venta</p><p className="font-medium text-foreground">{formatDate(contract.saleDate)}</p></div>
                    <div><p className="text-muted-foreground">Cantidad Total qqs.</p><p className="font-bold text-lg text-foreground">{contractQqs.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Diferencial</p><p className="font-medium text-pink-600 dark:text-pink-400">${contract.differential.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Unidad Precio</p><p className="font-medium text-foreground">{contract.priceUnit}</p></div>
                    <div><p className="text-muted-foreground">Tipo de Café</p><p className="font-medium text-green-600 dark:text-green-500">{contract.coffeeType || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Posición (Mes)</p><p className="font-medium text-foreground">{contract.position || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Mes Embarque</p><p className="font-medium text-foreground">{contract.shipmentMonth || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Contrato Terminado</p><p className={`font-medium ${contract.isFinished ? 'text-green-500' : 'text-yellow-500'}`}>{contract.isFinished ? 'Sí' : 'No'}</p></div>
                </div>

                {contract.certifications && contract.certifications.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Certificaciones</h4>
                        <div className="flex flex-wrap gap-2">
                            {contract.certifications.map(cert => (
                                <span key={cert} className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{cert}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-border flex gap-4">
                    <button className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Ver PDF Contrato</button>
                    <button className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Ver PDF Instrucciones</button>
                </div>
            </div>

            <AlertsBar lots={lots} threshingOrders={threshingOrders} contractQqs={contractQqs} />

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Listado de Partidas</h3>
                     {permissions?.add && <button onClick={() => setView('createLot')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <PlusIcon className="w-4 h-4" /> Agregar Partida
                    </button>}
                </div>
                
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-left text-muted-foreground whitespace-nowrap">
                        <thead className="text-xs uppercase bg-muted">
                             <tr>
                                <th className="px-4 py-2">Partida</th>
                                <th className="px-4 py-2">Bultos</th>
                                <th className="px-4 py-2">Empaque</th>
                                <th className="px-4 py-2 text-right">Peso Kg</th>
                                <th className="px-4 py-2 text-right">Diferencial</th>
                                <th className="px-4 py-2 text-right">Precio Final</th>
                                <th className="px-4 py-2">Muestra Enviada</th>
                                <th className="px-4 py-2">Aprobada</th>
                                <th className="px-4 py-2">ISF Req.</th>
                                <th className="px-4 py-2">ISF Enviado</th>
                                <th className="px-4 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={11} className="text-center py-10">Cargando partidas...</td></tr>
                            ) : lots.length > 0 ? (
                                lots.map(lot => {
                                    const needsFixation = !lot.fijacion || lot.fijacion === 0;
                                    const needsIsfSent = lot.isf && !lot.isfSent;
                                    return (
                                        <tr key={lot.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedLot(lot)}>
                                            <td className="px-4 py-3 font-semibold">
                                                <div className="flex items-center gap-2">
                                                    {needsFixation && <AlertIcon type="triangle" color="orange" />}
                                                    {needsIsfSent && <AlertIcon type="dot" color="blue" />}
                                                    <span className={needsFixation ? 'text-amber-500' : 'text-green-600'}>{lot.partida}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{lot.bultos}</td>
                                            <td className="px-4 py-3">{lot.empaque}</td>
                                            <td className="px-4 py-3 text-right">{lot.pesoKg.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">${contract.differential.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-medium text-foreground">${lot.precioFinal.toFixed(2)}</td>
                                            <td className="px-4 py-3">{lot.guiaMuestra ? 'Sí' : 'No'}</td>
                                            <td className="px-4 py-3">{lot.muestraAprobada ? 'Sí' : 'No'}</td>
                                            <td className="px-4 py-3">{lot.isf ? 'Sí' : 'No'}</td>
                                            <td className="px-4 py-3">{lot.isf ? (lot.isfSent ? 'Sí' : 'No') : 'N/A'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-4">
                                                    {permissions?.edit && <button onClick={(e) => { e.stopPropagation(); setLotToEdit(lot); }} className="text-yellow-500 hover:text-yellow-700"><PencilIcon className="w-4 h-4" /></button>}
                                                    {permissions?.delete && <button onClick={(e) => { e.stopPropagation(); setLotToDelete(lot); }} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={11} className="text-center py-10">No hay partidas para este contrato.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Órdenes de Trilla</h3>
                     {permissions?.add && <button onClick={() => setView('createThreshingOrder')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <FilePlusIcon className="w-4 h-4" /> Crear Orden de Trilla
                    </button>}
                </div>
                <div className="space-y-2 mb-4">
                    {threshingOrders.map(order => {
                        const neededPrimeras = order.lotIds.reduce((sum, lotId) => {
                            const lot = lots.find(l => l.id === lotId);
                            return sum + (lot?.pesoQqs ?? 0);
                        }, 0);
                        const difference = order.totalPrimeras - neededPrimeras;

                        if (difference < -0.005) {
                            const faltan = Math.abs(difference);
                            return (
                                <div key={order.id} className="p-3 text-sm rounded-md border border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300 flex items-center gap-3">
                                    <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0" fill="currentColor"><path d="M12 2L2 22h20L12 2z" /></svg>
                                    <span>Faltan <strong>{faltan.toFixed(2)} qqs.</strong> de primera para completar la orden <strong>{order.orderNumber}</strong>.</span>
                                </div>
                            );
                        } else {
                            const sobrante = difference;
                            return (
                                <div key={order.id} className="p-3 text-sm rounded-md border border-green-500 bg-green-500/10 text-green-700 dark:text-green-400 flex items-center gap-3">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <span>Has completado la orden de trilla <strong>{order.orderNumber}</strong>{sobrante > 0.005 ? `, tienes un sobrante estimado de <strong>${sobrante.toFixed(2)} qqs.</strong>` : '.'}</span>
                                </div>
                            );
                        }
                    })}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground whitespace-nowrap">
                        <thead className="text-xs uppercase bg-muted">
                            <tr>
                                <th className="px-4 py-2">No. Orden</th>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2">Partidas</th>
                                <th className="px-4 py-2 text-right">Total a Trillar</th>
                                <th className="px-4 py-2 text-right">Total Primeras</th>
                                <th className="px-4 py-2 text-right">Total Catadura</th>
                                <th className="px-4 py-2 text-right">Diferencia</th>
                                <th className="px-4 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                             {loading ? (
                                <tr><td colSpan={8} className="text-center py-10">Cargando órdenes...</td></tr>
                            ) : threshingOrders.length > 0 ? (
                                threshingOrders.map(order => {
                                    const neededPrimeras = order.lotIds.reduce((sum, lotId) => {
                                        const lot = lots.find(l => l.id === lotId);
                                        return sum + (lot?.pesoQqs ?? 0);
                                    }, 0);
                                    const difference = order.totalPrimeras - neededPrimeras;

                                    return (
                                        <tr key={order.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setOrderToView(order)}>
                                            <td className="px-4 py-3 font-semibold text-blue-600">{order.orderNumber}</td>
                                            <td className="px-4 py-3">{formatDate(order.creationDate)}</td>
                                            <td className="px-4 py-3 text-xs">{order.lotIds.map(id => lots.find(l=>l.id===id)?.partida || id).join(', ')}</td>
                                            <td className="px-4 py-3 text-right">{order.totalToThresh.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">{order.totalPrimeras.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">{order.totalCatadura.toFixed(2)}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${difference < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{difference.toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-4">
                                                    <button onClick={(e) => { e.stopPropagation(); handlePrintOrder(order); }} className="text-gray-500 hover:text-gray-700" title="Imprimir Orden"><PrinterIcon className="w-4 h-4" /></button>
                                                    {permissions?.edit && <button onClick={(e) => { e.stopPropagation(); setOrderToEdit(order); }} className="text-yellow-500 hover:text-yellow-700" title="Ver/Editar Orden"><PencilIcon className="w-4 h-4" /></button>}
                                                    {permissions?.delete && <button onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); }} className="text-red-500 hover:text-red-700" title="Anular Orden"><TrashIcon className="w-4 h-4" /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr><td colSpan={8} className="text-center py-10">No hay órdenes de trilla para este contrato.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {selectedLot && <LotDetailModal lot={selectedLot} onClose={() => setSelectedLot(null)} />}

            {lotToEdit && (
                <EditContractLotForm
                    lot={lotToEdit}
                    contract={contract}
                    onSave={handleUpdateLot}
                    onCancel={() => setLotToEdit(null)}
                />
            )}

            {lotToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar la partida <strong>{lotToDelete.partida}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setLotToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmDeleteLot} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Eliminar Partida
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {orderToView && (
                <ThreshingOrderDetailModal 
                    order={orderToView} 
                    lots={lots}
                    contract={contract}
                    onPrint={handlePrintOrder}
                    onClose={() => setOrderToView(null)}
                />
            )}

            {orderToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Anulación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de anular la orden <strong>{orderToDelete.orderNumber}</strong>? El inventario de los recibos utilizados será revertido.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setOrderToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmDeleteOrder} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Anular Orden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const GlobalAlertsBar: React.FC<{
    contracts: Contract[];
    lots: ContractLot[];
    threshingOrders: ThreshingOrder[];
}> = ({ contracts, lots, threshingOrders }) => {
    const alerts = useMemo(() => {
        const activeAlerts: { text: string, icon: React.ReactNode, colorClass: string, pulse: boolean }[] = [];
        if (!contracts || !lots) return [];

        const lotsByContract = lots.reduce((acc, lot) => {
            if (!acc[lot.contractId]) acc[lot.contractId] = [];
            acc[lot.contractId].push(lot);
            return acc;
        }, {} as Record<string, ContractLot[]>);

        for (const contract of contracts) {
            if (contract.isFinished) continue;

            const contractLots = lotsByContract[contract.id] || [];
            
            // Threshing Alert
            const totalProducedPrimeras = threshingOrders
                .filter(order => order.contractId === contract.id)
                .reduce((sum, order) => sum + order.totalPrimeras, 0);
            
            const contractTotalQqs = contractLots.reduce((sum, l) => sum + l.pesoQqs, 0);
            const missingQqsForCompletion = contractTotalQqs - totalProducedPrimeras;

            if (missingQqsForCompletion > 0.01) {
                activeAlerts.push({
                    text: `Contrato ${contract.contractNumber}: Faltan ${missingQqsForCompletion.toFixed(2)} qqs. para completar`,
                    icon: <AlertIcon type="triangle" color="orange" />,
                    colorClass: 'border-orange-500 text-orange-600 dark:text-orange-400',
                    pulse: false,
                });
            }
            
            // Fixation Alert
            const pendingFixationLots = contractLots.filter(l => !l.fijacion || l.fijacion === 0);
            if (pendingFixationLots.length > 0) {
                const lotNumbers = pendingFixationLots.map(l => l.partida.split('/').pop()).join(', ');
                const plural = pendingFixationLots.length > 1 ? 's' : '';
                activeAlerts.push({
                    text: `Contrato ${contract.contractNumber}: Partida${plural} ${lotNumbers} sin fijación`,
                    icon: <AlertIcon type="triangle" color="red" isPulsing />,
                    colorClass: 'border-red-500 text-red-600 dark:text-red-400',
                    pulse: true,
                });
            }

            // Sample Approval Alert
            const pendingSampleLots = contractLots.filter(l => !l.muestraAprobada);
            if (pendingSampleLots.length > 0) {
                const lotNumbers = pendingSampleLots.map(l => l.partida.split('/').pop()).join(', ');
                const plural = pendingSampleLots.length > 1 ? 's' : '';
                activeAlerts.push({
                    text: `Contrato ${contract.contractNumber}: Partida${plural} ${lotNumbers} sin muestra aprobada`,
                    icon: <AlertIcon type="triangle" color="orange" />, 
                    colorClass: 'border-orange-500 text-orange-600 dark:text-orange-400',
                    pulse: false,
                });
            }

            // ISF Alert
            const missingIsfSentLots = contractLots.filter(l => l.isf && !l.isfSent);
            if (missingIsfSentLots.length > 0) {
                const lotNumbers = missingIsfSentLots.map(l => l.partida.split('/').pop()).join(', ');
                const plural = missingIsfSentLots.length > 1 ? 's' : '';
                 activeAlerts.push({
                    text: `Contrato ${contract.contractNumber}: Partida${plural} ${lotNumbers} con ISF pendiente de envío`,
                    icon: <AlertIcon type="dot" color="blue" />,
                    colorClass: 'border-blue-500 text-blue-600 dark:text-blue-400',
                    pulse: false,
                });
            }
        }
        
        return activeAlerts;
    }, [contracts, lots, threshingOrders]);

    if (alerts.length === 0) return null;

    return (
        <div className="my-6">
            <h3 className="text-md font-semibold text-foreground mb-3">Alertas y Avisos Globales</h3>
            <div className="flex flex-wrap gap-3">
                {alerts.map((alert, index) => (
                    <div key={index} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full bg-muted/50 border ${alert.colorClass}`}>
                        {alert.icon}
                        <span>{alert.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ContractsPageProps {
  onCreateContractClick: () => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({ onCreateContractClick }) => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.contracts;
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [lots, setLots] = useState<ContractLot[]>([]);
    const [threshingOrders, setThreshingOrders] = useState<ThreshingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
    const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [contractQqs, setContractQqs] = useState<Map<string, number>>(new Map());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [contractsData, lotsData, threshingOrdersData] = await Promise.all([
                api.getCollection<Contract>('contracts'),
                api.getCollection<ContractLot>('contractLots'),
                api.getCollection<ThreshingOrder>('threshingOrders'),
            ]);
            
            const qqsMap = new Map<string, number>();
            lotsData.forEach(lot => {
                const currentQqs = qqsMap.get(lot.contractId) || 0;
                qqsMap.set(lot.contractId, currentQqs + lot.pesoQqs);
            });

            setContracts(contractsData.sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()));
            setLots(lotsData);
            setThreshingOrders(threshingOrdersData);
            setContractQqs(qqsMap);
        } catch (error) {
             console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['contracts', 'contractLots', 'threshingOrders'].includes(customEvent.detail.collectionName)) {
                fetchData();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const lotsByContractId = useMemo(() => {
        return lots.reduce((acc, lot) => {
            if (!acc[lot.contractId]) acc[lot.contractId] = [];
            acc[lot.contractId].push(lot);
            return acc;
        }, {} as Record<string, ContractLot[]>);
    }, [lots]);

    const handleDeleteClick = (e: React.MouseEvent, contract: Contract) => {
        e.stopPropagation();
        setContractToDelete(contract);
    };

    const handleEditClick = (e: React.MouseEvent, contract: Contract) => {
        e.stopPropagation();
        setContractToEdit(contract);
    };

    const handleUpdateContract = async (updatedContract: Contract) => {
        try {
            await api.updateDocument('contracts', updatedContract.id, updatedContract);
        } catch (error) {
            console.error("Error updating contract:", error);
        } finally {
            setContractToEdit(null);
        }
    };

    const confirmDelete = async () => {
        if (!contractToDelete) return;
        try {
            const lots = await api.getCollection<ContractLot>('contractLots', lot => lot.contractId === contractToDelete.id);
            const deleteLotPromises = lots.map(lot => api.deleteDocument('contractLots', lot.id!));
            await Promise.all(deleteLotPromises);
            await api.deleteDocument('contracts', contractToDelete.id);
        } catch (error) {
            console.error("Error deleting contract and its lots:", error);
        } finally {
            setContractToDelete(null);
        }
    };
    
    if (selectedContract) {
        return <ContractDetailView 
                    contract={selectedContract} 
                    onBack={() => setSelectedContract(null)} 
                    contractQqs={contractQqs.get(selectedContract.id) || 0}
                    permissions={permissions}
                />;
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Contratos</h2>
                {permissions?.add && <button onClick={onCreateContractClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" /> Crear Contrato
                </button>}
            </div>

            <GlobalAlertsBar contracts={contracts} lots={lots} threshingOrders={threshingOrders} />

            <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted whitespace-nowrap">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha Venta</th>
                            <th scope="col" className="px-6 py-3">Contrato</th>
                            <th scope="col" className="px-6 py-3">Comprador</th>
                            <th scope="col" className="px-6 py-3">Tipo de Café</th>
                            <th scope="col" className="px-6 py-3 text-right">Cantidad</th>
                            <th scope="col" className="px-6 py-3">Posición</th>
                            <th scope="col" className="px-6 py-3">Mes de Embarque</th>
                            <th scope="col" className="px-6 py-3 text-right">Diferencial</th>
                            <th scope="col" className="px-6 py-3 text-center">Fijaciones Pendientes</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="text-center py-10">Cargando contratos...</td></tr>
                        ) : contracts.length > 0 ? (
                            contracts.map((contract) => {
                                const contractLots = lotsByContractId[contract.id] || [];
                                const fixPendCount = contractLots.filter(l => !l.fijacion || l.fijacion === 0).length;
                                
                                return (
                                    <tr key={contract.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedContract(contract)}>
                                        <td className="px-6 py-4">{formatDate(contract.saleDate)}</td>
                                        <td className="px-6 py-4 font-medium text-foreground">{contract.contractNumber}</td>
                                        <td className="px-6 py-4 text-foreground">{contract.buyerName}</td>
                                        <td className="px-6 py-4">{contract.coffeeType}</td>
                                        <td className="px-6 py-4 text-right">{(contractQqs.get(contract.id) || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">{contract.position}</td>
                                        <td className="px-6 py-4">{contract.shipmentMonth}</td>
                                        <td className="px-6 py-4 text-right">${contract.differential.toFixed(2)}</td>
                                        <td className={`px-6 py-4 text-center font-bold ${fixPendCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {fixPendCount > 0 ? fixPendCount : '✓'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-4">
                                                {permissions?.edit && <button className="text-yellow-500 hover:text-yellow-700" onClick={(e) => handleEditClick(e, contract)}>
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>}
                                                {permissions?.delete && <button className="text-red-500 hover:text-red-700" onClick={(e) => handleDeleteClick(e, contract)}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                             <tr><td colSpan={10} className="text-center py-10">No hay contratos para mostrar. ¡Crea el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {contractToEdit && (
                <EditContractForm 
                    contract={contractToEdit}
                    onSave={handleUpdateContract}
                    onCancel={() => setContractToEdit(null)}
                />
            )}
            {contractToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar el contrato <strong>{contractToDelete.contractNumber}</strong>? Todas las partidas asociadas también serán eliminadas. Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setContractToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Eliminar Contrato
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractsPage;