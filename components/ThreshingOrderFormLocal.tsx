import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Client, PurchaseReceipt, Supplier, ThreshingOrder, ThreshingOrderReceipt, Viñeta, Mezcla, Rendimiento, Reproceso } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { printComponent } from '../utils/printUtils';
import ThreshingOrderPDF from './ThreshingOrderPDF';

interface ThreshingOrderFormLocalProps {
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
}

const ThreshingOrderFormLocal: React.FC<ThreshingOrderFormLocalProps> = ({ onCancel, onSaveSuccess }) => {
    const [clientId, setClientId] = useState('');
    const [description, setDescription] = useState('');
    const [lote, setLote] = useState('');
    const [tipoPreparacion, setTipoPreparacion] = useState('');
    const [pesoVendido, setPesoVendido] = useState('');

    const [availableReceipts, setAvailableReceipts] = useState<PurchaseReceipt[]>([]);
    const [availableVignettes, setAvailableVignettes] = useState<Viñeta[]>([]);
    const [availableMezclas, setAvailableMezclas] = useState<Mezcla[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [inputRows, setInputRows] = useState<InputRow[]>([{ id: `row_${Date.now()}`, inputType: 'Recibo', sourceId: '', amountToThresh: 0 }]);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [receiptsData, suppliersData, clientsData, rendimientosData, reprocesosData, mezclasData] = await Promise.all([
                    api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.enBodega > 0 && r.status === 'Activo' && r.gMuestra > 0),
                    api.getCollection<Supplier>('suppliers'),
                    api.getCollection<Client>('clients'),
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos'),
                    api.getCollection<Mezcla>('mezclas', m => m.sobranteEnBodega > 0.005),
                ]);
                 const allVignettes = [
                    ...rendimientosData.flatMap(r => r.vignettes),
                    ...reprocesosData.flatMap(r => r.outputVignettes)
                ];

                setAvailableReceipts(receiptsData);
                setAvailableVignettes(allVignettes.filter(v => (v.status === 'En Bodega' || v.status === 'Mezclada Parcialmente') && v.pesoNeto > 0.005));
                setAvailableMezclas(mezclasData);
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

    const addInputRow = () => {
        setInputRows(prev => [...prev, { id: `row_${Date.now()}`, inputType: 'Recibo', sourceId: '', amountToThresh: 0 }]);
    };

    const removeInputRow = (rowId: string) => {
        setInputRows(prev => prev.filter(row => row.id !== rowId));
    };

     const handleRowChange = (rowId: string, field: keyof InputRow, value: string | number) => {
        setInputRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            
            let updatedRow = { ...row, [field]: value };
    
            if (field === 'inputType') {
                updatedRow.sourceId = '';
                updatedRow.amountToThresh = 0;
                delete updatedRow.projectedPrimerasPercent;
                delete updatedRow.projectedCataduraPercent;
            } else if (field === 'sourceId') {
                let maxAmount = 0;
                if(updatedRow.inputType === 'Recibo') maxAmount = availableReceipts.find(r => r.id === value)?.enBodega || 0;
                if(updatedRow.inputType === 'Viñeta') maxAmount = availableVignettes.find(v => v.id === value)?.pesoNeto || 0;
                if(updatedRow.inputType === 'Mezcla') maxAmount = availableMezclas.find(m => m.id === value)?.sobranteEnBodega || 0;
                updatedRow.amountToThresh = maxAmount;
            } else if (field === 'amountToThresh') {
                 let maxAmount = 0;
                if(row.inputType === 'Recibo') maxAmount = availableReceipts.find(r => r.id === row.sourceId)?.enBodega || 0;
                if(row.inputType === 'Viñeta') maxAmount = availableVignettes.find(v => v.id === row.sourceId)?.pesoNeto || 0;
                if(row.inputType === 'Mezcla') maxAmount = availableMezclas.find(m => m.id === row.sourceId)?.sobranteEnBodega || 0;

                if (Number(value) > maxAmount) {
                    updatedRow[field] = maxAmount;
                }
            }
    
            return updatedRow;
        }));
    };
    
    const usedSourceIds = useMemo(() => 
        new Set(inputRows.map(r => r.sourceId)), 
    [inputRows]);

    const calculations = useMemo(() => {
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
                    primeras = amount * ((Number(receipt.rendimientoPrimera) || 0) / 100);
                    catadura = amount * ((Number(receipt.rendimientoRechazo) || 0) / 100);
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

        const pesoVendidoNum = parseFloat(pesoVendido) || 0;
        const difference = totalPrimeras - pesoVendidoNum;
        
        return { totalToThresh, totalPrimeras, totalCatadura, difference, detailedRows };
    }, [inputRows, availableReceipts, availableVignettes, availableMezclas, suppliers, pesoVendido]);

    const handleSave = async () => {
        if (!clientId || inputRows.some(row => !row.sourceId || row.amountToThresh <= 0)) {
            alert('Por favor, completa toda la información requerida.');
            return;
        }

        setIsSaving(true);
        try {
            const allOrders = await api.getCollection<ThreshingOrder>('threshingOrders');
            const localOrders = allOrders.filter(o => o.orderNumber.startsWith('OTVL-'));
            const maxNum = localOrders.reduce((max, o) => Math.max(max, parseInt(o.orderNumber.split('-')[1]) || 0), 0);
            const orderNumber = `OTVL-${maxNum + 1}`;

            const newOrderData: Omit<ThreshingOrder, 'id'> = {
                contractId: null, orderNumber, creationDate: new Date().toISOString().split('T')[0], lotIds: [], notes: '', totalToThresh: calculations.totalToThresh, totalPrimeras: calculations.totalPrimeras, totalCatadura: calculations.totalCatadura, orderType: 'Venta Local', clientId, clientName: clients.find(c => c.id === clientId)?.name || '', description, lote, tipoPreparacion, pesoVendido: parseFloat(pesoVendido) || 0
            };
            const newOrder = await api.addDocument<ThreshingOrder>('threshingOrders', newOrderData);

            const orderReceiptsForPdf: ThreshingOrderReceipt[] = [];
            const inventoryUpdatePromises: Promise<any>[] = [];

            const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const allReprocesos = await api.getCollection<Reproceso>('reprocesos');

            for (const row of calculations.detailedRows) {
                let sourceNumber = '';
                if (row.inputType === 'Recibo') sourceNumber = availableReceipts.find(s => s.id === row.sourceId)?.recibo || '';
                if (row.inputType === 'Viñeta') sourceNumber = availableVignettes.find(s => s.id === row.sourceId)?.numeroViñeta || '';
                if (row.inputType === 'Mezcla') sourceNumber = availableMezclas.find(s => s.id === row.sourceId)?.mezclaNumber || '';

                const orderReceipt: Omit<ThreshingOrderReceipt, 'id'> = {
                    threshingOrderId: newOrder.id, receiptId: row.sourceId, receiptNumber: sourceNumber, inputType: row.inputType, supplierName: row.supplierName, coffeeType: row.coffeeType, amountToThresh: Number(row.amountToThresh), primeras: row.primeras, catadura: row.catadura, projectedPrimerasPercent: row.projectedPrimerasPercent ? Number(row.projectedPrimerasPercent) : undefined, projectedCataduraPercent: row.projectedCataduraPercent ? Number(row.projectedCataduraPercent) : undefined
                };
                const savedOrderReceipt = await api.addDocument<ThreshingOrderReceipt>('threshingOrderReceipts', orderReceipt);
                orderReceiptsForPdf.push(savedOrderReceipt);

                if (row.inputType === 'Recibo') {
                    const receipt = availableReceipts.find(r => r.id === row.sourceId);
                    if(receipt) {
                        inventoryUpdatePromises.push(api.updateDocument<PurchaseReceipt>('purchaseReceipts', receipt.id, {
                            trillado: (Number(receipt.trillado) || 0) + (Number(row.amountToThresh) || 0),
                            enBodega: (Number(receipt.enBodega) || 0) - (Number(row.amountToThresh) || 0),
                        }));
                    }
                } else if (row.inputType === 'Mezcla') {
                    const mezcla = availableMezclas.find(m => m.id === row.sourceId);
                     if (mezcla) {
                        inventoryUpdatePromises.push(api.updateDocument<Mezcla>('mezclas', mezcla.id, {
                            cantidadDespachada: (Number(mezcla.cantidadDespachada) || 0) + (Number(row.amountToThresh) || 0),
                            sobranteEnBodega: (Number(mezcla.sobranteEnBodega) || 0) - (Number(row.amountToThresh) || 0),
                        }));
                    }
                } else if (row.inputType === 'Viñeta') {
                    let parentDoc: Rendimiento | Reproceso | undefined;
                    let collectionName: 'rendimientos' | 'reprocesos' | undefined;
                    let vignetteArrayKey: 'vignettes' | 'outputVignettes' | undefined;

                    parentDoc = allRendimientos.find(r => r.vignettes.some(v => v.id === row.sourceId));
                    if(parentDoc) { collectionName = 'rendimientos'; vignetteArrayKey = 'vignettes'; }
                    else {
                        parentDoc = allReprocesos.find(r => r.outputVignettes.some(v => v.id === row.sourceId));
                        if(parentDoc) { collectionName = 'reprocesos'; vignetteArrayKey = 'outputVignettes'; }
                    }

                    if (parentDoc && collectionName && vignetteArrayKey) {
                        const updatedVignettes = (parentDoc[vignetteArrayKey] as Viñeta[]).map(v => {
                            if (v.id === row.sourceId) {
                                const newPeso = v.pesoNeto - Number(row.amountToThresh);
                                const newStatus: Viñeta['status'] = newPeso > 0.005 ? 'Mezclada Parcialmente' : 'Utilizada en Trilla';
                                return { ...v, pesoNeto: newPeso, status: newStatus };
                            }
                            return v;
                        });
                        inventoryUpdatePromises.push(api.updateDocument(collectionName, parentDoc.id, { [vignetteArrayKey]: updatedVignettes }));
                    }
                }
            }
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
                 <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mb-4 border-b pb-2">Asignar Insumos para la Trilla</h3>
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
                                let maxAmount = 0;
                                if(row.inputType === 'Recibo') maxAmount = availableReceipts.find(r => r.id === row.sourceId)?.enBodega || 0;
                                if(row.inputType === 'Viñeta') maxAmount = availableVignettes.find(v => v.id === row.sourceId)?.pesoNeto || 0;
                                if(row.inputType === 'Mezcla') maxAmount = availableMezclas.find(m => m.id === row.sourceId)?.sobranteEnBodega || 0;
                                return (
                                    <tr key={row.id} className="border-b">
                                        <td className="p-2 align-top"><select value={row.inputType} onChange={e => handleRowChange(row.id, 'inputType', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"><option value="Recibo">Recibo</option><option value="Viñeta">Viñeta</option><option value="Mezcla">Mezcla</option></select></td>
                                        <td className="p-2 align-top">
                                            <select value={row.sourceId} onChange={e => handleRowChange(row.id, 'sourceId', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input">
                                                <option value="" disabled>Seleccionar...</option>
                                                {row.inputType === 'Recibo' && availableReceipts.filter(r => !usedSourceIds.has(r.id!) || r.id === row.sourceId).map(r => <option key={r.id} value={r.id}>{`${r.recibo} (${(Number(r.enBodega) || 0).toFixed(2)} qqs.)`}</option>)}
                                                {row.inputType === 'Viñeta' && availableVignettes.filter(v => !usedSourceIds.has(v.id!) || v.id === row.sourceId).map(v => <option key={v.id} value={v.id}>{`${v.numeroViñeta} (${v.pesoNeto.toFixed(2)} qqs.)`}</option>)}
                                                {row.inputType === 'Mezcla' && availableMezclas.filter(m => !usedSourceIds.has(m.id!) || m.id === row.sourceId).map(m => <option key={m.id} value={m.id}>{`${m.mezclaNumber} (${m.sobranteEnBodega.toFixed(2)} qqs.)`}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-2 align-top text-xs">{row.supplierName}</td>
                                        <td className="p-2 align-top text-xs">{row.coffeeType}</td>
                                        <td className="p-2 align-top"><input type="number" value={row.amountToThresh} onChange={e => handleRowChange(row.id, 'amountToThresh', e.target.value)} max={maxAmount} disabled={!row.sourceId} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                        {row.inputType !== 'Recibo' ? (
                                            <>
                                                <td className="p-2 align-top"><input type="number" placeholder="% 1ras" value={row.projectedPrimerasPercent || ''} onChange={e => handleRowChange(row.id, 'projectedPrimerasPercent', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                                <td className="p-2 align-top"><input type="number" placeholder="% Cata." value={row.projectedCataduraPercent || ''} onChange={e => handleRowChange(row.id, 'projectedCataduraPercent', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                            </>
                                        ) : <td colSpan={2} className="p-2 text-center text-muted-foreground text-xs align-middle">Automático</td>}
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