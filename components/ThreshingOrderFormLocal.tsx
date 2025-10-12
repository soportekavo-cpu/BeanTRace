import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Client, PurchaseReceipt, Supplier, ThreshingOrder, ThreshingOrderReceipt } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { printComponent } from '../utils/printUtils';
import ThreshingOrderPDF from './ThreshingOrderPDF';

interface ThreshingOrderFormLocalProps {
    onCancel: () => void;
    onSaveSuccess: () => void;
}

type ReceiptRow = {
    id: string; // temp id for react key
    receiptId: string;
    amountToThresh: number;
};

const ThreshingOrderFormLocal: React.FC<ThreshingOrderFormLocalProps> = ({ onCancel, onSaveSuccess }) => {
    const [clientId, setClientId] = useState('');
    const [description, setDescription] = useState('');
    const [lote, setLote] = useState('');
    const [tipoPreparacion, setTipoPreparacion] = useState('');
    const [pesoVendido, setPesoVendido] = useState('');

    const [availableReceipts, setAvailableReceipts] = useState<PurchaseReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [receiptRows, setReceiptRows] = useState<ReceiptRow[]>([{ id: `row_${Date.now()}`, receiptId: '', amountToThresh: 0 }]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [receiptsData, suppliersData, clientsData] = await Promise.all([
                    api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.enBodega > 0 && r.status === 'Activo' && r.gMuestra > 0),
                    api.getCollection<Supplier>('suppliers'),
                    api.getCollection<Client>('clients'),
                ]);
                setAvailableReceipts(receiptsData);
                setSuppliers(suppliersData);
                setClients(clientsData);
            } catch (error) {
                console.error("Error fetching data for threshing form:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddReceiptRow = () => {
        setReceiptRows(prev => [...prev, { id: `row_${Date.now()}`, receiptId: '', amountToThresh: 0 }]);
    };

    const handleRemoveReceiptRow = (rowId: string) => {
        setReceiptRows(prev => prev.length > 1 ? prev.filter(row => row.id !== rowId) : prev);
    };

    const handleRowChange = (rowId: string, field: 'receiptId' | 'amountToThresh', value: string) => {
        setReceiptRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            if (field === 'receiptId') {
                 const selectedReceipt = availableReceipts.find(r => r.id === value);
                 return { ...row, receiptId: value, amountToThresh: selectedReceipt?.enBodega || 0 };
            }
            return { ...row, [field]: parseFloat(value) || 0 };
        }));
    };
    
    const selectedReceiptIdsInForm = useMemo(() => 
        new Set(receiptRows.map(r => r.receiptId)), 
    [receiptRows]);

    const calculations = useMemo(() => {
        let totalToThresh = 0;
        let totalPrimeras = 0;
        let totalCatadura = 0;
        
        const detailedRows = receiptRows.map(row => {
            const receipt = availableReceipts.find(r => r.id === row.receiptId);
            if (!receipt) return null;
            
            const amountToThreshNum = Number(row.amountToThresh) || 0;
            const primeras = amountToThreshNum * (receipt.rendimientoPrimera / 100);
            const catadura = amountToThreshNum * (receipt.rendimientoRechazo / 100);
            
            totalToThresh += amountToThreshNum;
            totalPrimeras += primeras;
            totalCatadura += catadura;

            return {
                ...row,
                supplierName: suppliers.find(s => s.id === receipt.proveedorId)?.name || 'N/A',
                coffeeType: receipt.tipo === 'Otro' ? receipt.customTipo : receipt.tipo,
                primeras,
                catadura,
                total: primeras + catadura,
                receipt,
            };
        }).filter((row): row is NonNullable<typeof row> => row !== null);

        const pesoVendidoNum = parseFloat(pesoVendido) || 0;
        const difference = totalPrimeras - pesoVendidoNum;
        
        return { totalToThresh, totalPrimeras, totalCatadura, difference, detailedRows };
    }, [receiptRows, availableReceipts, suppliers, pesoVendido]);

    const handleSave = async () => {
        if (!clientId) {
            alert('Por favor, selecciona un cliente.');
            return;
        }
        if (receiptRows.some(row => !row.receiptId || row.amountToThresh <= 0)) {
            alert('Por favor, completa la información de todos los recibos añadidos.');
            return;
        }

        setIsSaving(true);
        try {
            const allOrders = await api.getCollection<ThreshingOrder>('threshingOrders');
            const localOrders = allOrders.filter(o => o.orderNumber.startsWith('OTVL-'));
            const maxNum = localOrders.reduce((max, o) => {
                const num = parseInt(o.orderNumber.split('-')[1]);
                return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            const orderNumber = `OTVL-${maxNum + 1}`;

            const newOrderData: Omit<ThreshingOrder, 'id'> = {
                contractId: null,
                orderNumber,
                creationDate: new Date().toISOString().split('T')[0],
                lotIds: [],
                notes: '',
                totalToThresh: calculations.totalToThresh,
                totalPrimeras: calculations.totalPrimeras,
                totalCatadura: calculations.totalCatadura,
                orderType: 'Venta Local',
                clientId,
                clientName: clients.find(c => c.id === clientId)?.name || '',
                description,
                lote,
                tipoPreparacion,
                pesoVendido: parseFloat(pesoVendido) || 0
            };
            
            const newOrder = await api.addDocument<ThreshingOrder>('threshingOrders', newOrderData);

            const orderReceiptsForPdf: ThreshingOrderReceipt[] = [];

            const orderReceiptPromises = calculations.detailedRows.map(async (row) => {
                const orderReceipt: Omit<ThreshingOrderReceipt, 'id'> = {
                    threshingOrderId: newOrder.id,
                    receiptId: row.receipt.id,
                    receiptNumber: row.receipt.recibo,
                    supplierName: row.supplierName,
                    coffeeType: row.coffeeType!,
                    amountToThresh: row.amountToThresh,
                    primeras: row.primeras,
                    catadura: row.catadura,
                };
                const savedOrderReceipt = await api.addDocument<ThreshingOrderReceipt>('threshingOrderReceipts', orderReceipt);
                orderReceiptsForPdf.push(savedOrderReceipt);
            });
            await Promise.all(orderReceiptPromises);

            const allAffectedReceiptIds = [...new Set(calculations.detailedRows.map(r => r.receipt.id))];
            const inventoryUpdatePromises = allAffectedReceiptIds.map(async (receiptId) => {
                const receipt = availableReceipts.find(r => r.id === receiptId);
                if (!receipt) return;
                
                const allOrderReceiptsForThisPurchase = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.receiptId === receiptId);
                const newTotalTrillado = allOrderReceiptsForThisPurchase.reduce((sum, or) => sum + or.amountToThresh, 0);
                const newEnBodega = receipt.pesoNeto - newTotalTrillado;

                await api.updateDocument<PurchaseReceipt>('purchaseReceipts', receipt.id, {
                    trillado: newTotalTrillado,
                    enBodega: newEnBodega,
                });
            });
            await Promise.all(inventoryUpdatePromises);
            
            printComponent(
                <ThreshingOrderPDF order={newOrder} receipts={orderReceiptsForPdf} clientName={newOrder.clientName} />,
                `Venta-Local-${newOrder.orderNumber}`
            );

            onSaveSuccess();

        } catch (error) {
            console.error("Error saving local sale order:", error);
            alert("Hubo un error al guardar la orden.");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver a Ventas Locales</button>
            <h2 className="text-2xl font-bold text-foreground">Crear Orden de Trilla para Venta Local</h2>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 border-b pb-2">Información de la Venta</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                         <div>
                            <label htmlFor="clientId" className="block text-sm font-medium text-muted-foreground mb-1">Cliente *</label>
                            <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full p-2 border rounded-md bg-background border-input">
                                <option value="" disabled>Selecciona un cliente</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="lote" className="block text-sm font-medium text-muted-foreground mb-1">Lote</label>
                            <input id="lote" value={lote} onChange={(e) => setLote(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input" />
                        </div>
                         <div>
                            <label htmlFor="tipoPreparacion" className="block text-sm font-medium text-muted-foreground mb-1">Tipo de Preparación</label>
                            <input id="tipoPreparacion" value={tipoPreparacion} onChange={(e) => setTipoPreparacion(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input" />
                        </div>
                    </div>
                     <div className="space-y-6">
                        <div>
                            <label htmlFor="pesoVendido" className="block text-sm font-medium text-muted-foreground mb-1">Peso Vendido (qqs.)</label>
                            <input type="number" id="pesoVendido" value={pesoVendido} onChange={(e) => setPesoVendido(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">Descripción / Notas</label>
                            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full p-2 border rounded-md bg-background border-input"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                 <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 border-b pb-2">Asignar Recibos de Café</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground"><tr>
                            <th className="p-2 w-[30%]">Recibo</th>
                            <th className="p-2 w-[25%]">Proveedor</th>
                            <th className="p-2 w-[15%] text-right">A Trillar</th>
                            <th className="p-2 w-[15%] text-right">Primeras</th>
                            <th className="p-2 w-[5%]"></th>
                        </tr></thead>
                        <tbody>
                            {receiptRows.map(row => {
                                const detailedRow = calculations.detailedRows.find(dr => dr.id === row.id);
                                const selectedReceipt = availableReceipts.find(r => r.id === row.receiptId);
                                return (
                                    <tr key={row.id} className="border-b">
                                        <td className="p-2 align-top">
                                            <select value={row.receiptId} onChange={e => handleRowChange(row.id, 'receiptId', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input">
                                                <option value="" disabled>Seleccionar recibo</option>
                                                {availableReceipts
                                                    .filter(r => !selectedReceiptIdsInForm.has(r.id!) || r.id === row.receiptId)
                                                    .map(r => <option key={r.id} value={r.id}>Recibo {r.recibo} ({r.enBodega.toFixed(2)} en bodega)</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">{detailedRow?.supplierName || '...'}</td>
                                        <td className="p-2 align-top">
                                            <input type="number" value={row.amountToThresh} onChange={e => handleRowChange(row.id, 'amountToThresh', e.target.value)} 
                                                max={selectedReceipt?.enBodega} disabled={!row.receiptId}
                                                className="w-full p-2 border rounded-md bg-background border-input text-right" />
                                        </td>
                                        <td className="p-2 align-top text-right font-medium">{detailedRow ? detailedRow.primeras.toFixed(2) : '0.00'}</td>
                                        <td className="p-2 align-top">
                                            <button onClick={() => handleRemoveReceiptRow(row.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
                  <button onClick={handleAddReceiptRow} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md">
                    <PlusIcon className="w-4 h-4" /> Añadir Recibo
                </button>
            </div>
            
            <div className="bg-card border-2 border-green-500/50 rounded-lg shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="font-semibold"><p className="text-muted-foreground text-sm">Necesario (Primeras)</p><p className="text-2xl text-foreground">{(parseFloat(pesoVendido) || 0).toFixed(2)}</p></div>
                    <div className="font-semibold"><p className="text-muted-foreground text-sm">Producido (Primeras)</p><p className="text-2xl text-foreground">{calculations.totalPrimeras.toFixed(2)}</p></div>
                    <div className="font-semibold"><p className="text-muted-foreground text-sm">Diferencia para completar orden</p><p className={`text-3xl ${calculations.difference < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{calculations.difference.toFixed(2)}</p></div>
                </div>
                 <div className="pt-4 border-t mt-4 col-span-full grid grid-cols-3 gap-6">
                    <div><p className="text-muted-foreground text-sm">Total A Trillar</p><p className="text-xl font-bold">{calculations.totalToThresh.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Primeras</p><p className="text-xl font-bold">{calculations.totalPrimeras.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Catadura</p><p className="text-xl font-bold">{calculations.totalCatadura.toFixed(2)}</p></div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving || !clientId} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                    {isSaving ? 'Guardando...' : 'Guardar e Imprimir'}
                </button>
            </div>
        </div>
    );
};

export default ThreshingOrderFormLocal;