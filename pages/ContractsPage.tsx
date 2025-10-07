import React, { useState, useEffect } from 'react';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { Contract, ContractLot, Exporter, ThreshingOrder, PurchaseReceipt, ThreshingOrderReceipt } from '../types';
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
import PrintManager from '../components/PrintManager';


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
                    <div><p className="text-muted-foreground">Booking</p><p className="font-medium text-foreground">{lot.booking || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Naviera</p><p className="font-medium text-foreground">{lot.naviera || 'N/A'}</p></div>
                </div>
            </div>
        </div>
    </div>
)};

const ContractDetailView: React.FC<{ contract: Contract; onBack: () => void; contractQqs: number; }> = ({ contract, onBack, contractQqs }) => {
    const [lots, setLots] = useState<ContractLot[]>([]);
    const [threshingOrders, setThreshingOrders] = useState<ThreshingOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporter, setExporter] = useState<Exporter | null>(null);
    const [showAddLotForm, setShowAddLotForm] = useState(false);
    const [lotToDelete, setLotToDelete] = useState<ContractLot | null>(null);
    const [lotToEdit, setLotToEdit] = useState<ContractLot | null>(null);
    const [selectedLot, setSelectedLot] = useState<ContractLot | null>(null);
    const [view, setView] = useState<'details' | 'createThreshingOrder'>('details');

    const [orderToView, setOrderToView] = useState<ThreshingOrder | null>(null);
    const [orderToDelete, setOrderToDelete] = useState<ThreshingOrder | null>(null);
    const [orderToPrint, setOrderToPrint] = useState<{order: ThreshingOrder, receipts: ThreshingOrderReceipt[]} | null>(null);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [lotsData, exportersData, ordersData] = await Promise.all([
                api.getCollection<ContractLot>("contractLots", (lot) => lot.contractId === contract.id),
                api.getCollection<Exporter>('exporters', (exp) => exp.id === contract.exporterId),
                api.getCollection<ThreshingOrder>("threshingOrders", (order) => order.contractId === contract.id),
            ]);
            setLots(lotsData);
            setThreshingOrders(ordersData.sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()));
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
            const orderReceipts = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === orderToDelete.id);
            
            const inventoryUpdatePromises = orderReceipts.map(async (or) => {
                const receipt = await api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.id === or.receiptId).then(res => res[0]);
                if (receipt) {
                    const newTrillado = receipt.trillado - or.amountToThresh;
                    const newEnBodega = receipt.enBodega + or.amountToThresh;
                    // FIX: Explicitly provide the generic type to `updateDocument` to ensure correct type inference.
                    await api.updateDocument<PurchaseReceipt>('purchaseReceipts', receipt.id!, { trillado: newTrillado, enBodega: newEnBodega });
                }
            });
            await Promise.all(inventoryUpdatePromises);
            
            const deleteReceiptPromises = orderReceipts.map(or => api.deleteDocument('threshingOrderReceipts', or.id!));
            await Promise.all(deleteReceiptPromises);
            
            await api.deleteDocument('threshingOrders', orderToDelete.id!);
        } catch (error) {
            console.error("Error deleting threshing order and reverting inventory:", error);
        } finally {
            setOrderToDelete(null);
        }
    };
    
    const handlePrintOrder = async (order: ThreshingOrder) => {
        const orderReceipts = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === order.id);
        setOrderToPrint({ order, receipts: orderReceipts });
    };

    const PaymentStatusBadge: React.FC<{status: ContractLot['paymentStatus']}> = ({ status }) => {
        const statusMap = {
            unpaid: { text: 'Pendiente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
            'in-progress': { text: 'En Cobro', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
            paid: { text: 'Pagado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        };
        const { text, color } = statusMap[status] || statusMap.unpaid;
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{text}</span>;
    };

    if (view === 'createThreshingOrder') {
        return <ThreshingOrderForm contract={contract} contractLots={lots} onCancel={() => setView('details')} onSaveSuccess={() => setView('details')} />
    }

    return (
        <div className="space-y-8">
            <button onClick={onBack} className="text-sm font-medium text-green-600 hover:underline">
                &larr; Volver a Contratos
            </button>
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Contrato: {contract.contractNumber}</h2>
                        <p className="text-muted-foreground">{contract.buyerName}</p>
                    </div>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-6 text-sm">
                    <div><p className="text-muted-foreground">Exportadora</p><p className="font-medium text-foreground">{contract.exporterName}</p></div>
                    <div><p className="text-muted-foreground">Fecha Venta</p><p className="font-medium text-foreground">{formatDate(contract.saleDate)}</p></div>
                    <div><p className="text-muted-foreground">Cantidad Total qqs.</p><p className="font-medium text-foreground">{contractQqs.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Diferencial</p><p className="font-medium text-foreground">${contract.differential.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground">Unidad Precio</p><p className="font-medium text-foreground">{contract.priceUnit}</p></div>
                    <div><p className="text-muted-foreground">Tipo de Café</p><p className="font-medium text-foreground">{contract.coffeeType || 'N/A'}</p></div>
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

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Listado de Partidas</h3>
                     <button onClick={() => setShowAddLotForm(prev => !prev)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <PlusIcon className="w-4 h-4" /> {showAddLotForm ? 'Ocultar Formulario' : 'Agregar Partida'}
                    </button>
                </div>
                {showAddLotForm && exporter && (
                    <AddContractLotForm 
                        contract={contract} 
                        exporter={exporter} 
                        existingLots={lots} 
                        onCancel={() => setShowAddLotForm(false)}
                        onLotAdded={() => {
                            setShowAddLotForm(false);
                        }}
                    />
                )}
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-muted">
                            <tr>
                                <th className="px-4 py-2">Partida</th>
                                <th className="px-4 py-2">Bultos</th>
                                <th className="px-4 py-2">Empaque</th>
                                <th className="px-4 py-2">Peso (qqs)</th>
                                <th className="px-4 py-2">Destino</th>
                                <th className="px-4 py-2">Muestra Aprob.</th>
                                <th className="px-4 py-2 text-center">Estado Pago</th>
                                <th className="px-4 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-10">Cargando partidas...</td></tr>
                            ) : lots.length > 0 ? (
                                lots.map(lot => (
                                    <tr key={lot.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedLot(lot)}>
                                        <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{lot.partida}</td>
                                        <td className="px-4 py-3">{lot.bultos}</td>
                                        <td className="px-4 py-3">{lot.empaque}</td>
                                        <td className="px-4 py-3">{lot.pesoQqs.toFixed(2)}</td>
                                        <td className="px-4 py-3">{lot.destino}</td>
                                        <td className="px-4 py-3">{lot.muestraAprobada ? 'Sí' : 'No'}</td>
                                        <td className="px-4 py-3 text-center"><PaymentStatusBadge status={lot.paymentStatus} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-4">
                                                <button onClick={(e) => { e.stopPropagation(); setLotToEdit(lot); }} className="text-yellow-500 hover:text-yellow-700"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setLotToDelete(lot); }} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} className="text-center py-10">No hay partidas para este contrato.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Órdenes de Trilla</h3>
                     <button onClick={() => setView('createThreshingOrder')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <FilePlusIcon className="w-4 h-4" /> Crear Orden de Trilla
                    </button>
                </div>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-muted">
                            <tr>
                                <th className="px-4 py-2">No. Orden</th>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2">Partidas</th>
                                <th className="px-4 py-2 text-right">Total a Trillar</th>
                                <th className="px-4 py-2 text-right">Total Primeras</th>
                                <th className="px-4 py-2 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                             {loading ? (
                                <tr><td colSpan={6} className="text-center py-10">Cargando órdenes...</td></tr>
                            ) : threshingOrders.length > 0 ? (
                                threshingOrders.map(order => (
                                    <tr key={order.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setOrderToView(order)}>
                                        <td className="px-4 py-3 font-semibold text-blue-600">{order.orderNumber}</td>
                                        <td className="px-4 py-3">{formatDate(order.creationDate)}</td>
                                        <td className="px-4 py-3 text-xs">{order.lotIds.map(id => lots.find(l=>l.id===id)?.partida || id).join(', ')}</td>
                                        <td className="px-4 py-3 text-right">{order.totalToThresh.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">{order.totalPrimeras.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-4">
                                                <button onClick={(e) => { e.stopPropagation(); handlePrintOrder(order); }} className="text-gray-500 hover:text-gray-700" title="Imprimir Orden"><PrinterIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setOrderToView(order); }} className="text-yellow-500 hover:text-yellow-700" title="Ver/Editar Orden"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); }} className="text-red-500 hover:text-red-700" title="Anular Orden"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} className="text-center py-10">No hay órdenes de trilla para este contrato.</td></tr>
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

            {orderToPrint && (
                <PrintManager onFinished={() => setOrderToPrint(null)}>
                    <ThreshingOrderPDF order={orderToPrint.order} receipts={orderToPrint.receipts} contract={contract} lots={lots} />
                </PrintManager>
            )}
        </div>
    );
};

interface ContractsPageProps {
  onCreateContractClick: () => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({ onCreateContractClick }) => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
    const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [contractQqs, setContractQqs] = useState<Map<string, number>>(new Map());

    const fetchContractsAndLots = async () => {
        setLoading(true);
        try {
            const [contractsData, lotsData] = await Promise.all([
                api.getCollection<Contract>('contracts'),
                api.getCollection<ContractLot>('contractLots')
            ]);
            
            const qqsMap = new Map<string, number>();
            lotsData.forEach(lot => {
                const currentQqs = qqsMap.get(lot.contractId) || 0;
                qqsMap.set(lot.contractId, currentQqs + lot.pesoQqs);
            });

            setContracts(contractsData);
            setContractQqs(qqsMap);
        } catch (error) {
             console.error("Error fetching contracts and lots: ", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchContractsAndLots();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['contracts', 'contractLots'].includes(customEvent.detail.collectionName)) {
                fetchContractsAndLots();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

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
                />;
    }

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Contratos</h2>
                <button onClick={onCreateContractClick} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" /> Crear Contrato
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">No. Contrato</th>
                            <th scope="col" className="px-6 py-3">Comprador</th>
                            <th scope="col" className="px-6 py-3">Fecha Venta</th>
                            <th scope="col" className="px-6 py-3">Cantidad qqs.</th>
                            <th scope="col" className="px-6 py-3 text-center">Terminado</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10">Cargando contratos...</td></tr>
                        ) : contracts.length > 0 ? (
                            contracts.map((contract) => (
                                <tr key={contract.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedContract(contract)}>
                                    <td className="px-6 py-4 font-medium text-foreground">{contract.contractNumber}</td>
                                    <td className="px-6 py-4 text-foreground">{contract.buyerName}</td>
                                    <td className="px-6 py-4">{formatDate(contract.saleDate)}</td>
                                    <td className="px-6 py-4 text-right">{(contractQqs.get(contract.id) || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-medium ${contract.isFinished ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {contract.isFinished ? 'Sí' : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button className="text-yellow-500 hover:text-yellow-700" onClick={(e) => handleEditClick(e, contract)}>
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700" onClick={(e) => handleDeleteClick(e, contract)}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={6} className="text-center py-10">No hay contratos para mostrar. ¡Crea el primero!</td></tr>
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