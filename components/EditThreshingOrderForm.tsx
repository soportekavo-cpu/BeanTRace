import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Contract, ContractLot, PurchaseReceipt, Supplier, ThreshingOrder, ThreshingOrderReceipt } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';

interface EditThreshingOrderFormProps {
    order: ThreshingOrder;
    contract: Contract;
    contractLots: ContractLot[];
    allThreshingOrders: ThreshingOrder[];
    onCancel: () => void;
    onSaveSuccess: () => void;
}

type ReceiptRow = {
    id: string; // temp id for react key
    receiptId: string;
    amountToThresh: number;
    originalAmount?: number;
    threshingOrderReceiptId?: string; 
};


const EditThreshingOrderForm: React.FC<EditThreshingOrderFormProps> = ({ order, contract, contractLots, allThreshingOrders, onCancel, onSaveSuccess }) => {
    const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set(order.lotIds));
    const [availableReceipts, setAvailableReceipts] = useState<PurchaseReceipt[]>([]);
    const [originalOrderReceipts, setOriginalOrderReceipts] = useState<ThreshingOrderReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [receiptRows, setReceiptRows] = useState<ReceiptRow[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [receiptsData, suppliersData, orderReceiptsData] = await Promise.all([
                    api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.status === 'Activo'),
                    api.getCollection<Supplier>('suppliers'),
                    api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === order.id)
                ]);

                setAvailableReceipts(receiptsData);
                setSuppliers(suppliersData);
                setOriginalOrderReceipts(orderReceiptsData);

                const initialRows = orderReceiptsData.map(or => ({
                    id: or.id!,
                    receiptId: or.receiptId,
                    amountToThresh: or.amountToThresh,
                    originalAmount: or.amountToThresh,
                    threshingOrderReceiptId: or.id!
                }));
                setReceiptRows(initialRows);

            } catch (error) {
                console.error("Error fetching data for threshing form:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [order]);

    const availableLotsForEditing = useMemo(() => {
        const usedInOtherOrders = new Set(allThreshingOrders.filter(o => o.id !== order.id).flatMap(o => o.lotIds));
        return contractLots.filter(lot => !usedInOtherOrders.has(lot.id!));
    }, [contractLots, allThreshingOrders, order.id]);


    const handleLotToggle = (lotId: string) => {
        setSelectedLotIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lotId)) {
                newSet.delete(lotId);
            } else {
                newSet.add(lotId);
            }
            return newSet;
        });
    };
    
    const handleAddReceiptRow = () => {
        setReceiptRows(prev => [...prev, { id: `row_${Date.now()}`, receiptId: '', amountToThresh: 0, originalAmount: 0 }]);
    };

    const handleRemoveReceiptRow = (rowId: string) => {
        setReceiptRows(prev => prev.filter(row => row.id !== rowId));
    };

    const handleRowChange = (rowId: string, field: 'receiptId' | 'amountToThresh', value: string) => {
        setReceiptRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            if (field === 'receiptId') {
                 return { ...row, receiptId: value, amountToThresh: 0 };
            }
            const amount = parseFloat(value) || 0;
            const selectedReceipt = availableReceipts.find(r => r.id === row.receiptId);
            const originalAmount = row.originalAmount || 0;
            const maxAmount = (selectedReceipt?.enBodega || 0) + originalAmount;

            return { ...row, [field]: Math.min(amount, maxAmount) };
        }));
    };
    
    const selectedReceiptIdsInForm = useMemo(() => new Set(receiptRows.map(r => r.receiptId)), [receiptRows]);

    const calculations = useMemo(() => {
        const neededPrimeras = Array.from(selectedLotIds).reduce((sum: number, lotId) => {
            const lot = contractLots.find(l => l.id === lotId);
            return sum + (lot?.pesoQqs ?? 0);
        }, 0);
        
        let totalToThresh = 0;
        let totalPrimeras = 0;
        let totalCatadura = 0;
        
        const detailedRows = receiptRows.map(row => {
            const receipt = availableReceipts.find(r => r.id === row.receiptId);
            if (!receipt) return null;
            
            const amountToThreshNum = Number(row.amountToThresh) || 0;
            // FIX: Ensure arithmetic operations are performed on numbers by casting potentially non-numeric values to a number and providing a fallback.
            const primeras = amountToThreshNum * ((Number(receipt.rendimientoPrimera) || 0) / 100);
            const catadura = amountToThreshNum * ((Number(receipt.rendimientoRechazo) || 0) / 100);
            
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

        const difference = totalPrimeras - neededPrimeras;
        
        return { neededPrimeras, totalToThresh, totalPrimeras, totalCatadura, difference, detailedRows };
    }, [selectedLotIds, receiptRows, availableReceipts, contractLots, suppliers]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allReceiptIds = new Set([...originalOrderReceipts.map(r => r.receiptId), ...receiptRows.map(r => r.receiptId)]);
            const promises: Promise<any>[] = [];
    
            // First, update/add/delete the ThreshingOrderReceipts for THIS order
            const newReceiptsMap = new Map(receiptRows.map(r => [r.receiptId, r]));
            const oldReceiptsMap = new Map(originalOrderReceipts.map(r => [r.receiptId, r]));
    
            for (const receiptId of new Set([...newReceiptsMap.keys(), ...oldReceiptsMap.keys()])) {
                // FIX: Correctly type variables that can be undefined when retrieved from a Map.
                const newRow: ReceiptRow | undefined = newReceiptsMap.get(receiptId);
                const oldRow: ThreshingOrderReceipt | undefined = oldReceiptsMap.get(receiptId);
    
                if (newRow && !oldRow) { // Added
                    const detailedRow = calculations.detailedRows.find(r => r.receiptId === receiptId);
                    if (!detailedRow) continue;
                    const orderReceipt: Omit<ThreshingOrderReceipt, 'id'> = { threshingOrderId: order.id, receiptId: newRow.receiptId, receiptNumber: detailedRow.receipt.recibo, supplierName: detailedRow.supplierName, coffeeType: detailedRow.coffeeType || '', primeras: detailedRow.primeras, catadura: detailedRow.catadura, amountToThresh: newRow.amountToThresh };
                    promises.push(api.addDocument<ThreshingOrderReceipt>('threshingOrderReceipts', orderReceipt));
                } else if (!newRow && oldRow) { // Deleted
                    promises.push(api.deleteDocument('threshingOrderReceipts', oldRow.id!));
                } else if (newRow && oldRow && newRow.amountToThresh !== oldRow.amountToThresh) { // Modified
                    const detailedRow = calculations.detailedRows.find(r => r.receiptId === receiptId);
                    if (!detailedRow) continue;
                    const updatedOrderReceipt = { amountToThresh: newRow.amountToThresh, primeras: detailedRow.primeras, catadura: detailedRow.catadura };
                    promises.push(api.updateDocument<ThreshingOrderReceipt>('threshingOrderReceipts', oldRow.id!, updatedOrderReceipt));
                }
            }
            
            // Wait for TOR changes to settle
            await Promise.all(promises);
            promises.length = 0; // Clear promises array

            // Now, recalculate inventory from scratch for every affected PurchaseReceipt
            for (const receiptId of allReceiptIds) {
                const receipt = availableReceipts.find(r => r.id === receiptId) || await api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.id === receiptId).then(res => res[0]);
                if (!receipt) continue;

                const allOrderReceiptsForThisPurchase = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.receiptId === receiptId);
                const newTotalTrillado = allOrderReceiptsForThisPurchase.reduce((sum, or) => sum + or.amountToThresh, 0);
                const newEnBodega = receipt.pesoNeto - newTotalTrillado;

                promises.push(api.updateDocument<PurchaseReceipt>('purchaseReceipts', receipt.id!, { 
                    trillado: newTotalTrillado, 
                    enBodega: newEnBodega 
                }));
            }
    
            // --- UPDATE MAIN ORDER ---
            const updatedOrderData: Partial<ThreshingOrder> = {
                lotIds: Array.from(selectedLotIds),
                totalToThresh: calculations.totalToThresh,
                totalPrimeras: calculations.totalPrimeras,
                totalCatadura: calculations.totalCatadura,
            };
            promises.push(api.updateDocument<ThreshingOrder>('threshingOrders', order.id, updatedOrderData));
            
            await Promise.all(promises);
            onSaveSuccess();

        } catch (error) {
            console.error("Error updating threshing order:", error);
            alert("Hubo un error al actualizar la orden.");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
             <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver al Contrato</button>
            <h2 className="text-2xl font-bold text-foreground">Editar Orden de Trilla: {order.orderNumber}</h2>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Paso 1: Modificar Partidas a Completar</h3>
                 <div className="space-y-2">
                    {availableLotsForEditing.map(lot => {
                        const isSelected = selectedLotIds.has(lot.id!);
                        return (
                             <button type="button" key={lot.id} onClick={() => handleLotToggle(lot.id!)}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 w-full text-left transition-colors ${ isSelected ? 'bg-blue-500/10 border-blue-500' : 'bg-muted/50 border-border hover:border-gray-400'}`}>
                               <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-background border border-border'}`}>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </span>
                                 <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                                    <span className="font-semibold text-green-600 truncate">{lot.partida}</span>
                                    <span className="font-medium">{lot.pesoQqs.toFixed(2)} qqs.</span>
                                    <span className="text-muted-foreground truncate hidden md:block">{contract.buyerName}</span>
                                    <span className="text-muted-foreground hidden md:block">{contract.coffeeType}</span>
                                </div>
                             </button>
                        );
                    })}
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                 <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Paso 2: Modificar Recibos de Café</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground"><tr>
                            <th className="p-2 w-[25%]">Recibo</th><th className="p-2 w-[20%]">Proveedor</th>
                            <th className="p-2 w-[10%]">Tipo</th><th className="p-2 w-[10%] text-right">A Trillar</th>
                            <th className="p-2 w-[10%] text-right">Primeras</th><th className="p-2 w-[10%] text-right">Catadura</th><th className="p-2 w-[5%]"></th>
                        </tr></thead>
                        <tbody>
                            {receiptRows.map(row => {
                                const detailedRow = calculations.detailedRows.find(dr => dr.id === row.id);
                                const selectedReceipt = availableReceipts.find(r => r.id === row.receiptId);
                                const originalAmount = row.originalAmount || 0;
                                const maxAmount = (selectedReceipt?.enBodega || 0) + originalAmount;
                                return (
                                    <tr key={row.id} className="border-b">
                                        <td className="p-2 align-top">
                                            <select value={row.receiptId} onChange={e => handleRowChange(row.id, 'receiptId', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input">
                                                <option value="" disabled>Seleccionar recibo</option>
                                                {availableReceipts
                                                    .filter(r => (r.id === row.receiptId) || (!selectedReceiptIdsInForm.has(r.id!) && r.gMuestra > 0))
                                                    .map(r => <option key={r.id} value={r.id}>Recibo {r.recibo} (Disp: {((r.enBodega || 0) + (r.id === row.receiptId ? originalAmount : 0)).toFixed(2)})</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">{detailedRow?.supplierName || '...'}</td>
                                        <td className="p-2 align-top">{detailedRow?.coffeeType || '...'}</td>
                                        <td className="p-2 align-top">
                                            <input type="number" value={row.amountToThresh} onChange={e => handleRowChange(row.id, 'amountToThresh', e.target.value)} 
                                                max={maxAmount} disabled={!row.receiptId}
                                                className="w-full p-2 border rounded-md bg-background border-input text-right" />
                                        </td>
                                        <td className="p-2 align-top text-right font-medium">{detailedRow ? detailedRow.primeras.toFixed(2) : '0.00'}</td>
                                        <td className="p-2 align-top text-right font-medium">{detailedRow ? detailedRow.catadura.toFixed(2) : '0.00'}</td>
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
            
            <div className="bg-card border-2 border-green-500/50 rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="font-semibold"><p className="text-muted-foreground text-sm">Necesario (Primeras)</p><p className="text-2xl text-foreground">{calculations.neededPrimeras.toFixed(2)}</p></div>
                <div className="font-semibold"><p className="text-muted-foreground text-sm">Producido (Primeras)</p><p className="text-2xl text-foreground">{calculations.totalPrimeras.toFixed(2)}</p></div>
                <div className="font-semibold col-span-2"><p className="text-muted-foreground text-sm">Diferencia para completar orden</p><p className={`text-3xl ${calculations.difference > 0 ? 'text-red-500' : 'text-green-600'}`}>{calculations.difference.toFixed(2)}</p></div>
                 <div className="pt-4 border-t col-span-full grid grid-cols-4 gap-6">
                    <div><p className="text-muted-foreground text-sm">Total A Trillar</p><p className="text-xl font-bold">{calculations.totalToThresh.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Primeras</p><p className="text-xl font-bold">{calculations.totalPrimeras.toFixed(2)}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Catadura</p><p className="text-xl font-bold">{calculations.totalCatadura.toFixed(2)}</p></div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
};

export default EditThreshingOrderForm;