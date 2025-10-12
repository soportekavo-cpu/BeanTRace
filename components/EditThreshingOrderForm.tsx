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
    id: string; 
    inputType: 'Recibo' | 'Viñeta' | 'Mezcla';
    sourceId: string;
    amountToThresh: number;
    projectedPrimerasPercent?: number;
    projectedCataduraPercent?: number;
    originalAmount: number;
    threshingOrderReceiptId?: string;
}

const EditThreshingOrderForm: React.FC<EditThreshingOrderFormProps> = ({ order, contract, contractLots, allThreshingOrders, onCancel, onSaveSuccess }) => {
    const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set(order.lotIds));
    const [availableReceipts, setAvailableReceipts] = useState<PurchaseReceipt[]>([]);
    const [availableVignettes, setAvailableVignettes] = useState<Viñeta[]>([]);
    const [availableMezclas, setAvailableMezclas] = useState<Mezcla[]>([]);
    const [originalOrderReceipts, setOriginalOrderReceipts] = useState<ThreshingOrderReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [inputRows, setInputRows] = useState<InputRow[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [receiptsData, suppliersData, orderReceiptsData, rendimientosData, reprocesosData, mezclasData] = await Promise.all([
                    api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.status === 'Activo'),
                    api.getCollection<Supplier>('suppliers'),
                    api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', or => or.threshingOrderId === order.id),
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos'),
                    api.getCollection<Mezcla>('mezclas'),
                ]);

                const allVignettes = [
                    ...rendimientosData.flatMap(r => r.vignettes),
                    ...reprocesosData.flatMap(r => r.outputVignettes)
                ];

                setAvailableReceipts(receiptsData);
                setAvailableVignettes(allVignettes);
                setAvailableMezclas(mezclasData);
                setSuppliers(suppliersData);
                setOriginalOrderReceipts(orderReceiptsData);

                const initialRows: InputRow[] = orderReceiptsData.map(or => ({
                    id: or.id!,
                    inputType: or.inputType,
                    sourceId: or.receiptId,
                    amountToThresh: or.amountToThresh,
                    originalAmount: or.amountToThresh,
                    threshingOrderReceiptId: or.id!,
                    projectedPrimerasPercent: or.projectedPrimerasPercent,
                    projectedCataduraPercent: or.projectedCataduraPercent,
                }));
                setInputRows(initialRows);

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
    
    const addInputRow = () => {
        setInputRows(prev => [...prev, { id: `row_${Date.now()}`, inputType: 'Recibo', sourceId: '', amountToThresh: 0, originalAmount: 0 }]);
    };

    const removeInputRow = (rowId: string) => {
        setInputRows(prev => prev.filter(row => row.id !== rowId));
    };

    const handleRowChange = (rowId: string, field: keyof InputRow, value: string | number) => {
        setInputRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            
            const updatedRow = { ...row, [field]: value };
    
            if (field === 'inputType') {
                updatedRow.sourceId = '';
                updatedRow.amountToThresh = 0;
            } else if (field === 'sourceId') {
                let maxAmount = 0;
                const originalAmount = row.originalAmount || 0;
                if(updatedRow.inputType === 'Recibo') maxAmount = (availableReceipts.find(r => r.id === value)?.enBodega || 0) + originalAmount;
                if(updatedRow.inputType === 'Viñeta') maxAmount = (availableVignettes.find(v => v.id === value)?.pesoNeto || 0) + originalAmount;
                if(updatedRow.inputType === 'Mezcla') maxAmount = (availableMezclas.find(m => m.id === value)?.sobranteEnBodega || 0) + originalAmount;
                updatedRow.amountToThresh = maxAmount;
            }
    
            return updatedRow;
        }));
    };
    
    const usedSourceIds = useMemo(() => new Set(inputRows.map(r => r.sourceId)), [inputRows]);

    const calculations = useMemo(() => {
        const neededPrimeras = Array.from(selectedLotIds).reduce((sum: number, lotId) => {
            const lot = contractLots.find(l => l.id === lotId);
            return sum + (lot?.pesoQqs ?? 0);
        }, 0);
        
        let totalToThresh = 0, totalPrimeras = 0, totalCatadura = 0;
        
        const detailedRows = inputRows.map(row => {
            let primeras = 0, catadura = 0;
            let sourceInfo: any = { supplierName: 'N/A', coffeeType: 'N/A' };
            const amount = Number(row.amountToThresh) || 0;

            if (row.inputType === 'Recibo') {
                const receipt = availableReceipts.find(r => r.id === row.sourceId);
                if (receipt) {
                    primeras = amount * (receipt.rendimientoPrimera / 100);
                    catadura = amount * (receipt.rendimientoRechazo / 100);
                    sourceInfo = { supplierName: suppliers.find(s => s.id === receipt.proveedorId)?.name, coffeeType: receipt.tipo === 'Otro' ? receipt.customTipo : receipt.tipo };
                }
            } else {
                const primPercent = Number(row.projectedPrimerasPercent) || 0;
                const cataPercent = Number(row.projectedCataduraPercent) || 0;
                primeras = amount * (primPercent / 100);
                catadura = amount * (cataPercent / 100);

                if (row.inputType === 'Viñeta') {
                    sourceInfo = { coffeeType: availableVignettes.find(v => v.id === row.sourceId)?.tipo };
                } else if (row.inputType === 'Mezcla') {
                    sourceInfo = { coffeeType: availableMezclas.find(m => m.id === row.sourceId)?.tipoMezcla };
                }
            }
            
            totalToThresh += amount; totalPrimeras += primeras; totalCatadura += catadura;
            return { ...row, primeras, catadura, ...sourceInfo };
        });

        const difference = totalPrimeras - neededPrimeras;
        return { neededPrimeras, totalToThresh, totalPrimeras, totalCatadura, difference, detailedRows };
    }, [selectedLotIds, inputRows, availableReceipts, availableVignettes, availableMezclas, contractLots, suppliers]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Revert all original inventory values first
            const revertPromises: Promise<any>[] = [];
            
            const originalReceipts = await api.getCollection<PurchaseReceipt>('purchaseReceipts');
            const originalMezclas = await api.getCollection<Mezcla>('mezclas');
            const originalRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const originalReprocesos = await api.getCollection<Reproceso>('reprocesos');
    
            for (const or of originalOrderReceipts) {
                if (or.inputType === 'Recibo') {
                    const receipt = originalReceipts.find(r => r.id === or.receiptId);
                    if (receipt) revertPromises.push(api.updateDocument<PurchaseReceipt>('purchaseReceipts', or.receiptId, { enBodega: Number(receipt.enBodega) + or.amountToThresh, trillado: Number(receipt.trillado) - or.amountToThresh }));
                } else if (or.inputType === 'Mezcla') {
                    const mezcla = originalMezclas.find(m => m.id === or.receiptId);
                    if (mezcla) revertPromises.push(api.updateDocument<Mezcla>('mezclas', or.receiptId, { sobranteEnBodega: Number(mezcla.sobranteEnBodega) + or.amountToThresh, cantidadDespachada: Number(mezcla.cantidadDespachada) - or.amountToThresh }));
                }
            }
            await Promise.all(revertPromises);
            
            await Promise.all(originalOrderReceipts.map(or => api.deleteDocument('threshingOrderReceipts', or.id!)));

            const applyPromises: Promise<any>[] = [];
            for (const row of calculations.detailedRows) {
                const amount = Number(row.amountToThresh);
                if (amount <= 0) continue;

                // Create new order receipts
                let sourceNumber = availableReceipts.find(s => s.id === row.sourceId)?.recibo || availableVignettes.find(s => s.id === row.sourceId)?.numeroViñeta || availableMezclas.find(s => s.id === row.sourceId)?.mezclaNumber || '';
                const orderReceiptData: Omit<ThreshingOrderReceipt, 'id'> = { threshingOrderId: order.id, receiptId: row.sourceId, receiptNumber: sourceNumber, inputType: row.inputType, supplierName: row.supplierName, coffeeType: row.coffeeType, amountToThresh: amount, primeras: row.primeras, catadura: row.catadura, projectedPrimerasPercent: row.projectedPrimerasPercent, projectedCataduraPercent: row.projectedCataduraPercent };
                await api.addDocument<ThreshingOrderReceipt>('threshingOrderReceipts', orderReceiptData);

                // Update inventory
                if (row.inputType === 'Recibo') {
                    const r = (await api.getCollection<PurchaseReceipt>('purchaseReceipts', rec => rec.id === row.sourceId))[0];
                    if(r) applyPromises.push(api.updateDocument<PurchaseReceipt>('purchaseReceipts', r.id, { trillado: Number(r.trillado) + amount, enBodega: Number(r.enBodega) - amount }));
                } else if (row.inputType === 'Mezcla') {
                    const m = (await api.getCollection<Mezcla>('mezclas', mix => mix.id === row.sourceId))[0];
                    if(m) applyPromises.push(api.updateDocument<Mezcla>('mezclas', m.id, { cantidadDespachada: Number(m.cantidadDespachada) + amount, sobranteEnBodega: Number(m.sobranteEnBodega) - amount }));
                }
            }
            await Promise.all(applyPromises);

            const updatedOrderData: Partial<ThreshingOrder> = { lotIds: Array.from(selectedLotIds), totalToThresh: calculations.totalToThresh, totalPrimeras: calculations.totalPrimeras, totalCatadura: calculations.totalCatadura };
            await api.updateDocument<ThreshingOrder>('threshingOrders', order.id, updatedOrderData);
            
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
                 <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Paso 2: Modificar Insumos</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground whitespace-nowrap"><tr>
                                <th className="p-2 w-[15%]">Tipo Insumo</th>
                                <th className="p-2 w-[25%]">Fuente</th>
                                <th className="p-2 text-right w-[10%]">A Trillar</th>
                                <th className="p-2 text-center" colSpan={2}>Proyección Rendimiento</th>
                                <th className="p-2 text-right w-[10%]">Primeras</th>
                                <th className="p-2 text-right w-[10%]">Catadura</th>
                                <th className="p-2 w-[5%]"></th>
                            </tr></thead>
                        <tbody>
                            {calculations.detailedRows.map((row) => {
                                const originalAmount = Number(row.originalAmount) || 0;
                                let maxAmount = 0;
                                if(row.inputType === 'Recibo') {
                                    const receipt = availableReceipts.find(r => r.id === row.sourceId);
                                    maxAmount = (Number(receipt?.enBodega) || 0) + (row.sourceId === receipt?.id ? originalAmount : 0);
                                }
                                if(row.inputType === 'Viñeta') {
                                    const vignette = availableVignettes.find(v => v.id === row.sourceId);
                                    maxAmount = (Number(vignette?.pesoNeto) || 0) + (row.sourceId === vignette?.id ? originalAmount : 0);
                                }
                                if(row.inputType === 'Mezcla') {
                                    const mezcla = availableMezclas.find(m => m.id === row.sourceId);
                                    maxAmount = (Number(mezcla?.sobranteEnBodega) || 0) + (row.sourceId === mezcla?.id ? originalAmount : 0);
                                }
                                return (
                                    <tr key={row.id} className="border-b">
                                        <td className="p-2 align-top"><select value={row.inputType} onChange={e => handleRowChange(row.id, 'inputType', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"><option value="Recibo">Recibo</option><option value="Viñeta">Viñeta</option><option value="Mezcla">Mezcla</option></select></td>
                                        <td className="p-2 align-top">
                                            <select value={row.sourceId} onChange={e => handleRowChange(row.id, 'sourceId', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input">
                                                <option value="" disabled>Seleccionar...</option>
                                                {row.inputType === 'Recibo' && availableReceipts.filter(r => !usedSourceIds.has(r.id!) || r.id === row.sourceId).map(r => <option key={r.id} value={r.id}>{`C-${r.recibo} (Disp: ${((Number(r.enBodega) || 0) + (r.id === row.sourceId ? originalAmount : 0)).toFixed(2)})`}</option>)}
                                                {row.inputType === 'Viñeta' && availableVignettes.filter(v => !usedSourceIds.has(v.id!) || v.id === row.sourceId).map(v => <option key={v.id} value={v.id}>{`${v.numeroViñeta} (Disp: ${((Number(v.pesoNeto) || 0) + (v.id === row.sourceId ? originalAmount : 0)).toFixed(2)})`}</option>)}
                                                {row.inputType === 'Mezcla' && availableMezclas.filter(m => !usedSourceIds.has(m.id!) || m.id === row.sourceId).map(m => <option key={m.id} value={m.id}>{`${m.mezclaNumber} (Disp: ${((Number(m.sobranteEnBodega) || 0) + (m.id === row.sourceId ? originalAmount : 0)).toFixed(2)})`}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2 align-top"><input type="number" value={row.amountToThresh} onChange={e => handleRowChange(row.id, 'amountToThresh', e.target.value)} max={maxAmount} disabled={!row.sourceId} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                        {row.inputType !== 'Recibo' ? (
                                            <>
                                                <td className="p-2 align-top"><input type="number" placeholder="% Primeras" value={row.projectedPrimerasPercent || ''} onChange={e => handleRowChange(row.id, 'projectedPrimerasPercent', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                                <td className="p-2 align-top"><input type="number" placeholder="% Catadura" value={row.projectedCataduraPercent || ''} onChange={e => handleRowChange(row.id, 'projectedCataduraPercent', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                            </>
                                        ) : <td colSpan={2} className="p-2 text-center text-muted-foreground text-xs align-middle">Calculado Autom.</td>}
                                        <td className="p-2 align-top text-right font-medium">{row.primeras.toFixed(2)}</td>
                                        <td className="p-2 align-top text-right font-medium">{row.catadura.toFixed(2)}</td>
                                        <td className="p-2 align-top"><button onClick={() => removeInputRow(row.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
                  <button onClick={addInputRow} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md">
                    <PlusIcon className="w-4 h-4" /> Añadir Insumo
                </button>
            </div>
            
            <div className="bg-card border-2 border-green-500/50 rounded-lg shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="font-semibold"><p className="text-muted-foreground text-sm">Necesario (Primeras)</p><p className="text-2xl text-foreground">{calculations.neededPrimeras.toFixed(2)}</p></div>
                <div className="font-semibold"><p className="text-muted-foreground text-sm">Producido (Primeras)</p><p className="text-2xl text-foreground">{calculations.totalPrimeras.toFixed(2)}</p></div>
                <div className="font-semibold col-span-2"><p className="text-muted-foreground text-sm">Diferencia para completar orden</p><p className={`text-3xl ${calculations.difference < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{calculations.difference.toFixed(2)}</p></div>
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