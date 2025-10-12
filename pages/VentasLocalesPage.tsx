import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { ThreshingOrder, PurchaseReceipt, ThreshingOrderReceipt, Client, Mezcla, Rendimiento, Reproceso, Viñeta } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import ThreshingOrderFormLocal from '../components/ThreshingOrderFormLocal';
import ThreshingOrderDetailModalLocal from '../components/ThreshingOrderDetailModalLocal';
import EditThreshingOrderFormLocal from '../components/EditThreshingOrderFormLocal';
import { printComponent } from '../utils/printUtils';
import ThreshingOrderPDF from '../components/ThreshingOrderPDF';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const VentasLocalesPage: React.FC = () => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.ventasLocales;

    const [view, setView] = useState<'list' | 'form' | 'edit'>('list');
    const [orders, setOrders] = useState<ThreshingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderToEdit, setOrderToEdit] = useState<ThreshingOrder | null>(null);
    const [orderToView, setOrderToView] = useState<ThreshingOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<ThreshingOrder | null>(null);
    const [clients, setClients] = useState<Client[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersData, clientsData] = await Promise.all([
                api.getCollection<ThreshingOrder>('threshingOrders', o => o.orderType === 'Venta Local'),
                api.getCollection<Client>('clients'),
            ]);
            setOrders(ordersData.sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
            setClients(clientsData);
        } catch (error) {
            console.error("Error fetching local sales data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['threshingOrders', 'clients', 'threshingOrderReceipts', 'purchaseReceipts', 'rendimientos', 'reprocesos', 'mezclas'].includes(customEvent.detail.collectionName)) {
                fetchData();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleCreateClick = () => {
        setOrderToEdit(null);
        setView('form');
    }

    const handleEditClick = (e: React.MouseEvent, order: ThreshingOrder) => {
        e.stopPropagation();
        setOrderToEdit(order);
        setView('edit');
    }

    const handleDeleteClick = (e: React.MouseEvent, order: ThreshingOrder) => {
        e.stopPropagation();
        setOrderToDelete(order);
    }

    const confirmDelete = async () => {
        if (!orderToDelete) return;
        try {
            const orderReceiptsToDelete = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === orderToDelete.id);
            
            const allReceipts = await api.getCollection<PurchaseReceipt>('purchaseReceipts');
            const allMezclas = await api.getCollection<Mezcla>('mezclas');
            const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const allReprocesos = await api.getCollection<Reproceso>('reprocesos');
    
            const inventoryUpdatePromises: Promise<any>[] = [];
    
            for (const or of orderReceiptsToDelete) {
                switch (or.inputType) {
                    case 'Recibo': {
                        const receipt = allReceipts.find(r => r.id === or.receiptId);
                        if (receipt) {
                            inventoryUpdatePromises.push(api.updateDocument<PurchaseReceipt>('purchaseReceipts', receipt.id, {
                                trillado: receipt.trillado - or.amountToThresh,
                                enBodega: receipt.enBodega + or.amountToThresh,
                            }));
                        }
                        break;
                    }
                    case 'Mezcla': {
                        const mezcla = allMezclas.find(m => m.id === or.receiptId);
                        if (mezcla) {
                            inventoryUpdatePromises.push(api.updateDocument<Mezcla>('mezclas', mezcla.id, {
                                cantidadDespachada: mezcla.cantidadDespachada - or.amountToThresh,
                                sobranteEnBodega: mezcla.sobranteEnBodega + or.amountToThresh,
                            }));
                        }
                        break;
                    }
                    case 'Viñeta': {
                        const findAndRevertVignette = (parentDocs: (Rendimiento | Reproceso)[], vignetteArrayKey: 'vignettes' | 'outputVignettes', collectionName: 'rendimientos' | 'reprocesos') => {
                            for (const doc of parentDocs) {
                                const vignetteIndex = (doc[vignetteArrayKey] as Viñeta[]).findIndex(v => v.id === or.receiptId);
                                if (vignetteIndex > -1) {
                                    const updatedDoc = { ...doc };
                                    const vignette = { ...updatedDoc[vignetteArrayKey][vignetteIndex] };
                                    
                                    vignette.pesoNeto += or.amountToThresh;
                                    vignette.status = Math.abs(vignette.pesoNeto - vignette.originalPesoNeto) < 0.005 ? 'En Bodega' : 'Mezclada Parcialmente';

                                    updatedDoc[vignetteArrayKey][vignetteIndex] = vignette;
                                    inventoryUpdatePromises.push(api.updateDocument(collectionName, doc.id, { [vignetteArrayKey]: updatedDoc[vignetteArrayKey] }));
                                    return true;
                                }
                            }
                            return false;
                        };
                        
                        if (!findAndRevertVignette(allRendimientos, 'vignettes', 'rendimientos')) {
                            findAndRevertVignette(allReprocesos, 'outputVignettes', 'reprocesos');
                        }
                        break;
                    }
                }
            }
            
            await Promise.all(inventoryUpdatePromises);
            const deleteReceiptPromises = orderReceiptsToDelete.map(or => api.deleteDocument('threshingOrderReceipts', or.id!));
            await Promise.all(deleteReceiptPromises);
            await api.deleteDocument('threshingOrders', orderToDelete.id!);

        } catch (error) {
            console.error("Error deleting threshing order and reverting inventory:", error);
        } finally {
            setOrderToDelete(null);
        }
    };
    
    const handlePrintClick = (e: React.MouseEvent, order: ThreshingOrder) => {
        e.stopPropagation();
        handlePrintOrder(order);
    };

    const handlePrintOrder = async (order: ThreshingOrder) => {
        try {
            const orderReceipts = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === order.id);
            const clientName = clients.find(c => c.id === order.clientId)?.name;
            printComponent(
                <ThreshingOrderPDF order={order} receipts={orderReceipts} clientName={clientName} />,
                `Venta-Local-${order.orderNumber}`
            );
        } catch (e) {
            console.error("Failed to prepare print data for local sale:", e);
        }
    };


    const handleSaveSuccess = () => {
        setView('list');
        setOrderToEdit(null);
    }
    
    if (view === 'form') {
        return <ThreshingOrderFormLocal onCancel={() => setView('list')} onSaveSuccess={handleSaveSuccess} />
    }
    
    if (view === 'edit' && orderToEdit) {
        return <EditThreshingOrderFormLocal order={orderToEdit} onCancel={() => setView('list')} onSaveSuccess={handleSaveSuccess} />
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Ventas Locales</h2>
                {permissions?.add && <button onClick={handleCreateClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" /> Crear Venta Local
                </button>}
            </div>

            <div className="overflow-x-auto mt-6">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted whitespace-nowrap">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha</th>
                            <th scope="col" className="px-6 py-3">No. Orden</th>
                            <th scope="col" className="px-6 py-3">Cliente</th>
                            <th scope="col" className="px-6 py-3">Lote</th>
                            <th scope="col" className="px-6 py-3 text-right">Peso Vendido (qqs.)</th>
                            <th scope="col" className="px-6 py-3 text-right">Producido (qqs.)</th>
                            <th scope="col" className="px-6 py-3 text-right">Diferencia</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-10">Cargando...</td></tr>
                        ) : orders.length > 0 ? (
                            orders.map(order => {
                                const difference = order.totalPrimeras - (order.pesoVendido || 0);
                                return (
                                <tr key={order.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setOrderToView(order)}>
                                    <td className="px-6 py-4">{formatDate(order.creationDate)}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{order.orderNumber}</td>
                                    <td className="px-6 py-4">{order.clientName}</td>
                                    <td className="px-6 py-4">{order.lote}</td>
                                    <td className="px-6 py-4 text-right">{(order.pesoVendido || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">{order.totalPrimeras.toFixed(2)}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${difference < -0.005 ? 'text-red-500' : 'text-green-600'}`}>
                                        {difference.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            {permissions?.edit && <button className="text-yellow-500 hover:text-yellow-700" title="Editar" onClick={(e) => handleEditClick(e, order)}><PencilIcon className="w-4 h-4" /></button>}
                                            <button className="text-blue-500 hover:text-blue-700" title="Imprimir" onClick={(e) => handlePrintClick(e, order)}><PrinterIcon className="w-4 h-4" /></button>
                                            {permissions?.delete && <button className="text-red-500 hover:text-red-700" title="Anular" onClick={(e) => handleDeleteClick(e, order)}><TrashIcon className="w-4 h-4" /></button>}
                                        </div>
                                    </td>
                                </tr>
                            )})
                        ) : (
                             <tr><td colSpan={8} className="text-center py-10">No hay ventas locales para mostrar.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {orderToView && (
                <ThreshingOrderDetailModalLocal
                    order={orderToView} 
                    onPrint={handlePrintOrder}
                    onClose={() => setOrderToView(null)}
                />
            )}

            {orderToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Anulación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de anular la orden <strong>{orderToDelete.orderNumber}</strong>? El inventario de los insumos utilizados será revertido.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setOrderToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Anular Orden
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VentasLocalesPage;