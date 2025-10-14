import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Contract, ContractLot, PurchaseReceipt, Supplier, ThreshingOrder, ThreshingOrderReceipt, Viñeta, Mezcla, Rendimiento, Reproceso } from '../types';
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

interface InputRow {
    id: string; // temp id for react key
    inputType: 'Recibo' | 'Viñeta' | 'Mezcla';
    sourceId: string;
    amountToThresh: number;
    projectedPrimerasPercent?: number;
    projectedCataduraPercent?: number;
}


const EditThreshingOrderForm: React.FC<EditThreshingOrderFormProps> = ({ order, contract, contractLots, allThreshingOrders, onCancel, onSaveSuccess }) => {
    const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set());
    const [availableReceipts, setAvailableReceipts] = useState<PurchaseReceipt[]>([]);
    const [availableVignettes, setAvailableVignettes] = useState<Viñeta[]>([]);
    const [availableMezclas, setAvailableMezclas] = useState<Mezcla[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [inputRows, setInputRows] = useState<InputRow[]>([]);
    const [originalReceipts, setOriginalReceipts] = useState<ThreshingOrderReceipt[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [receiptsData, suppliersData, rendimientosData, reprocesosData, mezclasData, orderReceipts] = await Promise.all([
                    api.getCollection<PurchaseReceipt>('purchaseReceipts'),
                    api.getCollection<Supplier>('suppliers'),
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos'),
                    api.getCollection<Mezcla>('mezclas'),
                    api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === order.id),
                ]);

                const allVignettes = [
                    ...rendimientosData.flatMap(r => r.vignettes),
                    ...reprocesosData.flatMap(r => r.outputVignettes)
                ];
                
                const vignettesInThisOrderIds = new Set(
                    orderReceipts
                        .filter(or => or.inputType === 'Viñeta')
                        .map(or => or.receiptId)
                );

                const filteredVignettes = allVignettes.filter(v =>
                    (
                        (v.status === 'En Bodega' || v.status === 'Mezclada Parcialmente') &&
                        v.pesoNeto > 0.005
                    ) ||
                    vignettesInThisOrderIds.has(v.id)
                );

                setAvailableReceipts(receiptsData.filter(r => r.status === 'Activo'));
                setAvailableVignettes(filteredVignettes);
                setAvailableMezclas(mezclasData);
                setSuppliers(suppliersData);

                setOriginalReceipts(orderReceipts);
                setSelectedLotIds(new Set(order.lotIds));
                setInputRows(orderReceipts.map(or => ({
                    id: or.id!,
                    inputType: or.inputType,
                    sourceId: or.receiptId,
                    amountToThresh: or.amountToThresh,
                    projectedPrimerasPercent: or.projectedPrimerasPercent,
                    projectedCataduraPercent: or.projectedCataduraPercent,
                })));

            } catch (error) {
                console.error("Error fetching data for threshing form:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [order]);

    const availableLotsForThisOrder = useMemo(() => {
        const usedLotIdsInOtherOrders = new Set(allThreshingOrders.filter(o => o.id !== order.id).flatMap(o => o.lotIds));
        return contractLots.filter(lot => !usedLotIdsInOtherOrders.has(lot.id!));
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
    
    const addInputRow = () => {
        setInputRows(prev => [...prev, { id: `row_${Date.now()}`, inputType: 'Recibo', sourceId: '', amountToThresh: 0 }]);
    };

    const removeInputRow = (rowId: string) => {
        setInputRows(prev => prev.filter(row => row.id !== rowId));
    };

    const handleRowChange = (rowId: string, field: keyof InputRow, value: string | number) => {
        setInputRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
    
            let updatedRow: InputRow = { ...row };
    
            if (field === 'projectedPrimerasPercent' || field === 'projectedCataduraPercent') {
                let numValue = Math.max(0, Math.min(100, Number(value) || 0));
                const otherField = field === 'projectedPrimerasPercent' ? 'projectedCataduraPercent' : 'projectedPrimerasPercent';
                let otherValue = Number(row[otherField]) || 0;
    
                if (numValue + otherValue > 100) {
                    otherValue = 100 - numValue;
                }
                
                updatedRow = {
                    ...row,
                    [field]: numValue,
                    [otherField]: otherValue,
                };
            } else if (field === 'inputType') {
                updatedRow.inputType = value as 'Recibo' | 'Viñeta' | 'Mezcla';
                updatedRow.sourceId = '';
                updatedRow.amountToThresh = 0;
                delete updatedRow.projectedPrimerasPercent;
                delete updatedRow.projectedCataduraPercent;
            } else if (field === 'sourceId') {
                updatedRow.sourceId = value as string;
                let maxAmount = 0;
                const originalAmount = originalReceipts.find(or => or.receiptId === value)?.amountToThresh || 0;
                if(updatedRow.inputType === 'Recibo') maxAmount = (availableReceipts.find(r => r.id === value)?.enBodega || 0) + originalAmount;
                if(updatedRow.inputType === 'Viñeta') maxAmount = (availableVignettes.find(v => v.id === value)?.pesoNeto || 0) + originalAmount;
                if(updatedRow.inputType === 'Mezcla') maxAmount = (availableMezclas.find(m => m.id === value)?.sobranteEnBodega || 0) + originalAmount;
                updatedRow.amountToThresh = maxAmount;
            } else if (field === 'amountToThresh') {
                let maxAmount = 0;
                const originalAmount = originalReceipts.find(or => or.receiptId === row.sourceId)?.amountToThresh || 0;
                if(row.inputType === 'Recibo') maxAmount = (availableReceipts.find(r => r.id === row.sourceId)?.enBodega || 0) + originalAmount;
                if(row.inputType === 'Viñeta') maxAmount = (availableVignettes.find(v => v.id === row.sourceId)?.pesoNeto || 0) + originalAmount;
                if(row.inputType === 'Mezcla') maxAmount = (availableMezclas.find(m => m.id === row.sourceId)?.sobranteEnBodega || 0) + originalAmount;
                
                const newAmount = Number(value);
                updatedRow.amountToThresh = newAmount > maxAmount ? maxAmount : newAmount;
            } else {
                (updatedRow as any)[field] = value;
            }
    
            return updatedRow;
        }));
    };
    
    const usedSourceIds = useMemo(() => 
        new Set(inputRows.map(r => r.sourceId)), 
    [inputRows]);

    const calculations = useMemo(() => {
        const neededPrimeras = Array.from(selectedLotIds).reduce((sum: number, lotId) => {
            const lot = contractLots.find(l => l.id === lotId);
            return sum + (lot?.pesoQqs ?? 0);
        }, 0);
        
        let totalToThresh = 0;
        let totalPrimeras = 0;
        let totalCatadura = 0;
        
        const detailedRows = inputRows.map(row => {
            let primeras = 0;
            let catadura = 0;
            let sourceInfo: any = { supplierName: 'N/A', coffeeType: 'N/A' };
            const amount = Number(row.amountToThresh) || 0;

            if (row.inputType === 'Recibo') {
                const receipt = availableReceipts.find(r => r.id === row.sourceId);
                if (receipt) {
                    // FIX: Explicitly cast to Number to avoid potential type errors with arithmetic operations.
                    primeras = amount * (Number(receipt.rendimientoPrimera) / 100);
                    // FIX: Explicitly cast to Number to avoid potential type errors with arithmetic operations.
                    catadura = amount * (Number(receipt.rendimientoRechazo) / 100);
                    sourceInfo = {
                        supplierName: suppliers.find(s => s.id === receipt.proveedorId)?.name || 'N/A',
                        coffeeType: receipt.tipo === 'Otro' ? receipt.customTipo : receipt.tipo
                    };
                }
            } else {
                const primPercent = Number(row.projectedPrimerasPercent) || 0;
                const cataPercent = Number(row.projectedCataduraPercent) || 0;
                primeras = amount * (primPercent / 100);
                catadura = amount * (cataPercent / 100);

                if (row.inputType === 'Viñeta') {
                    const vignette = availableVignettes.find(v => v.id === row.sourceId);
                    if (vignette) sourceInfo = { coffeeType: vignette.tipo };
                } else if (row.inputType === 'Mezcla') {
                    const mezcla = availableMezclas.find(m => m.id === row.sourceId);
                    if (mezcla) sourceInfo = { coffeeType: mezcla.tipoMezcla };
                }
            }
            
            totalToThresh += amount;
            totalPrimeras += primeras;
            totalCatadura += catadura;

            return { ...row, primeras, catadura, ...sourceInfo };
        });

        const difference = totalPrimeras - neededPrimeras;
        
        return { neededPrimeras, totalToThresh, totalPrimeras, totalCatadura, difference, detailedRows };
    }, [selectedLotIds, inputRows, availableReceipts, availableVignettes, availableMezclas, contractLots, suppliers]);

    const handleSave = async () => {
        if (selectedLotIds.size === 0 || inputRows.some(row => !row.sourceId || Number(row.amountToThresh) <= 0)) {
            alert('Por favor, selecciona partidas y asegúrate de que todos los insumos tengan una fuente y una cantidad mayor a cero.');
            return;
        }
        setIsSaving(true);
        try {
            const inventoryChanges = new Map<string, { type: 'Recibo' | 'Viñeta' | 'Mezcla', delta: number }>();

            originalReceipts.forEach(or => {
                const change = inventoryChanges.get(or.receiptId) || { type: or.inputType, delta: 0 };
                change.delta += Number(or.amountToThresh); // Add back to inventory
                inventoryChanges.set(or.receiptId, change);
            });
    
            calculations.detailedRows.forEach(row => {
                const change = inventoryChanges.get(row.sourceId) || { type: row.inputType, delta: 0 };
                change.delta -= Number(row.amountToThresh); // Subtract from inventory
                inventoryChanges.set(row.sourceId, change);
            });
    
            const updatePromises: Promise<any>[] = [];
            const allReceipts = await api.getCollection<PurchaseReceipt>('purchaseReceipts');
            const allMezclas = await api.getCollection<Mezcla>('mezclas');
            const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const allReprocesos = await api.getCollection<Reproceso>('reprocesos');

            for (const [sourceId, change] of inventoryChanges.entries()) {
                if (Math.abs(change.delta) < 0.001) continue;
    
                if (change.type === 'Recibo') {
                    const receipt = allReceipts.find(r => r.id === sourceId);
                    if (receipt) {
                        updatePromises.push(api.updateDocument<PurchaseReceipt>('purchaseReceipts', sourceId, {
                            enBodega: (Number(receipt.enBodega) || 0) + change.delta,
                            trillado: (Number(receipt.trillado) || 0) - change.delta
                        }));
                    }
                } else if (change.type === 'Mezcla') {
                    const mezcla = allMezclas.find(m => m.id === sourceId);
                    if (mezcla) {
                        const newSobrante = (Number(mezcla.sobranteEnBodega) || 0) + change.delta;
                        const newDespachado = (Number(mezcla.cantidadDespachada) || 0) - change.delta;
                        const newStatus: Mezcla['status'] = newSobrante <= 0.005 ? 'Agotado' : (newDespachado > 0.005 ? 'Despachado Parcialmente' : 'Activo');
                        updatePromises.push(api.updateDocument<Mezcla>('mezclas', sourceId, {
                            sobranteEnBodega: newSobrante,
                            cantidadDespachada: newDespachado,
                            status: newStatus
                        }));
                    }
                } else if (change.type === 'Viñeta') {
                    let parentDoc: Rendimiento | Reproceso | undefined;
                    let collectionName: 'rendimientos' | 'reprocesos' | undefined;
                    let vignetteArrayKey: 'vignettes' | 'outputVignettes' | undefined;
    
                    parentDoc = allRendimientos.find(r => r.vignettes.some(v => v.id === sourceId));
                    if(parentDoc) { collectionName = 'rendimientos'; vignetteArrayKey = 'vignettes'; }
                    else {
                        parentDoc = allReprocesos.find(r => r.outputVignettes.some(v => v.id === sourceId));
                        if(parentDoc) { collectionName = 'reprocesos'; vignetteArrayKey = 'outputVignettes'; }
                    }
    
                    if (parentDoc && collectionName && vignetteArrayKey) {
                        const updatedVignettes = (parentDoc[vignetteArrayKey] as Viñeta[]).map(v => {
                            if (v.id === sourceId) {
                                const newPesoNeto = v.pesoNeto + change.delta;
                                const newStatus: Viñeta['status'] = newPesoNeto <= 0.005 ? 'Utilizada en Trilla' : (Math.abs(newPesoNeto - v.originalPesoNeto) < 0.005 ? 'En Bodega' : 'Mezclada Parcialmente');
                                return { ...v, pesoNeto: newPesoNeto, status: newStatus };
                            }
                            return v;
                        });
                        updatePromises.push(api.updateDocument(collectionName, parentDoc.id, { [vignetteArrayKey]: updatedVignettes }));
                    }
                }
            }
            await Promise.all(updatePromises);
    
            const deleteOldReceipts = originalReceipts.map(or => api.deleteDocument('threshingOrderReceipts', or.id!));
            await Promise.all(deleteOldReceipts);
    
            const addNewReceipts = calculations.detailedRows.map(row => {
                 let sourceNumber = '';
                if (row.inputType === 'Recibo') sourceNumber = availableReceipts.find(s => s.id === row.sourceId)?.recibo || '';
                if (row.inputType === 'Viñeta') sourceNumber = availableVignettes.find(s => s.id === row.sourceId)?.numeroViñeta || '';
                if (row.inputType === 'Mezcla') sourceNumber = availableMezclas.find(s => s.id === row.sourceId)?.mezclaNumber || '';
    
                const newOrderReceipt: Omit<ThreshingOrderReceipt, 'id'> = {
                    threshingOrderId: order.id, receiptId: row.sourceId, receiptNumber: sourceNumber, inputType: row.inputType, supplierName: row.supplierName, coffeeType: row.coffeeType, amountToThresh: Number(row.amountToThresh), primeras: row.primeras, catadura: row.catadura, projectedPrimerasPercent: row.projectedPrimerasPercent ? Number(row.projectedPrimerasPercent) : undefined, projectedCataduraPercent: row.projectedCataduraPercent ? Number(row.projectedCataduraPercent) : undefined
                };
                return api.addDocument<ThreshingOrderReceipt>('threshingOrderReceipts', newOrderReceipt);
            });
            await Promise.all(addNewReceipts);

            await api.updateDocument<ThreshingOrder>('threshingOrders', order.id, {
                lotIds: Array.from(selectedLotIds),
                totalToThresh: calculations.totalToThresh,
                totalPrimeras: calculations.totalPrimeras,
                totalCatadura: calculations.totalCatadura,
            });

            onSaveSuccess();
        } catch (error) {
            console.error("Error saving edited threshing order:", error);
            alert("Hubo un error al guardar los cambios.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="space-y-6">
             <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">
                &larr; Volver al Contrato
            </button>
            <h2 className="text-2xl font-bold text-foreground">Editar Orden de Trilla: {order.orderNumber}</h2>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Paso 1: Seleccionar Partidas a Completar</h3>
                {availableLotsForThisOrder.length > 0 ? (
                    <div className="space-y-2">
                        {availableLotsForThisOrder.map(lot => {
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
                ) : (
                    <p className="text-muted-foreground text-center py-4">Todas las partidas de este contrato ya han sido asignadas a una orden de trilla.</p>
                )}
            </div>

            {selectedLotIds.size > 0 && (
                <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                     <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Paso 2: Asignar Insumos para la Trilla</h3>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground whitespace-nowrap"><tr>
                                <th className="p-2 w-[12%]">Tipo Insumo</th>
                                <th className="p-2 w-[20%]">Fuente</th>
                                <th className="p-2 w-[15%]">Proveedor</th>
                                <th className="p-2 w-[12%]">Tipo Café</th>
                                <th className="p-2 text-right w-[10%]">A Trillar</th>
                                <th className="p-2 text-center" colSpan={2}>Proyección</th>
                                <th className="p-2 text-right w-[8%]">Primeras</th>
                                <th className="p-2 text-right w-[8%]">Catadura</th>
                                <th className="p-2 w-[5%]"></th>
                            </tr></thead>
                            <tbody>
                                {calculations.detailedRows.map((row) => {
                                    const originalAmount = originalReceipts.find(or => or.receiptId === row.sourceId)?.amountToThresh || 0;
                                    let maxAmount = 0;
                                    if(row.inputType === 'Recibo') maxAmount = (Number(availableReceipts.find(r => r.id === row.sourceId)?.enBodega) || 0) + originalAmount;
                                    if(row.inputType === 'Viñeta') maxAmount = (Number(availableVignettes.find(v => v.id === row.sourceId)?.pesoNeto) || 0) + originalAmount;
                                    if(row.inputType === 'Mezcla') maxAmount = (Number(availableMezclas.find(m => m.id === row.sourceId)?.sobranteEnBodega) || 0) + originalAmount;
                                    return (
                                        <tr key={row.id} className="border-b">
                                            <td className="p-2 align-top"><select value={row.inputType} onChange={e => handleRowChange(row.id, 'inputType', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"><option value="Recibo">Recibo</option><option value="Viñeta">Viñeta</option><option value="Mezcla">Mezcla</option></select></td>
                                            <td className="p-2 align-top">
                                                <select value={row.sourceId} onChange={e => handleRowChange(row.id, 'sourceId', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input">
                                                    <option value="" disabled>Seleccionar...</option>
                                                    {row.inputType === 'Recibo' && availableReceipts.filter(r => (!usedSourceIds.has(r.id!) || r.id === row.sourceId) && ((r.gMuestra > 0 && (Number(r.enBodega) || 0) > 0) || r.id === row.sourceId)).map(r => <option key={r.id} value={r.id}>{`${r.recibo} (${( (Number(r.enBodega) || 0) + (originalReceipts.find(or => or.receiptId === r.id)?.amountToThresh || 0) ).toFixed(2)} qqs.)`}</option>)}
                                                    {row.inputType === 'Viñeta' && availableVignettes.filter(v => (!usedSourceIds.has(v.id!) || v.id === row.sourceId)).map(v => <option key={v.id} value={v.id}>{`${v.numeroViñeta} (${(Number(v.pesoNeto) + (originalReceipts.find(or => or.receiptId === v.id)?.amountToThresh || 0)).toFixed(2)} qqs.)`}</option>)}
                                                    {row.inputType === 'Mezcla' && availableMezclas.filter(m => (!usedSourceIds.has(m.id!) || m.id === row.sourceId) && (Number(m.sobranteEnBodega) > 0 || m.id === row.sourceId)).map(m => <option key={m.id} value={m.id}>{`${m.mezclaNumber} (${(Number(m.sobranteEnBodega) + (originalReceipts.find(or => or.receiptId === m.id)?.amountToThresh || 0)).toFixed(2)} qqs.)`}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2 align-top text-xs">{row.supplierName}</td>
                                            <td className="p-2 align-top text-xs">{row.coffeeType}</td>
                                            <td className="p-2 align-top"><input type="number" value={row.amountToThresh} onChange={e => handleRowChange(row.id, 'amountToThresh', e.target.value)} max={maxAmount} disabled={!row.sourceId} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                            {row.inputType !== 'Recibo' ? (
                                                <>
                                                    <td className="p-2 align-top"><input type="number" placeholder="% 1ras" value={row.projectedPrimerasPercent ?? ''} onChange={e => handleRowChange(row.id, 'projectedPrimerasPercent', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                                    <td className="p-2 align-top"><input type="number" placeholder="% Cata." value={row.projectedCataduraPercent ?? ''} onChange={e => handleRowChange(row.id, 'projectedCataduraPercent', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                                </>
                                            ) : <td colSpan={2} className="p-2 text-center text-muted-foreground text-xs align-middle">Automático</td>}
                                            <td className="p-2 align-top text-right font-medium">{row.primeras.toFixed(2)}</td>
                                            <td className="p-2 align-top text-right font-medium">{row.catadura.toFixed(2)}</td>
                                            <td className="p-2 align-top"><button onClick={() => removeInputRow(row.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                             <tfoot className="font-bold bg-muted/50 text-foreground">
                                <tr className="border-t-2 border-border">
                                    <td colSpan={7} className="p-2 text-right">Totales:</td>
                                    <td className="p-2 text-right">{calculations.totalPrimeras.toFixed(2)}</td>
                                    <td className="p-2 text-right">{calculations.totalCatadura.toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                     </div>
                      <button onClick={addInputRow} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md">
                        <PlusIcon className="w-4 h-4" /> Añadir Insumo
                    </button>
                </div>
            )}
            
             {selectedLotIds.size > 0 && (
                <div className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-foreground">Resumen de Liquidación</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total a Trillar (Insumos)</p>
                            <p className="text-2xl font-bold">{calculations.totalToThresh.toFixed(2)}</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Primeras Producidas</p>
                            <p className="text-2xl font-bold">{calculations.totalPrimeras.toFixed(2)}</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Catadura Producida</p>
                            <p className="text-2xl font-bold">{calculations.totalCatadura.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="bg-blue-500/10 p-4 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-300">Primeras Necesarias (Contrato)</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{calculations.neededPrimeras.toFixed(2)}</p>
                        </div>

                        <div className={`p-4 rounded-lg ${calculations.difference < -0.005 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                            <p className={`text-sm ${calculations.difference < -0.005 ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`}>Diferencia para Completar Orden</p>
                            <p className={`text-4xl font-bold ${calculations.difference < -0.005 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {calculations.difference.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving || selectedLotIds.size === 0} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
};

export default EditThreshingOrderForm;
