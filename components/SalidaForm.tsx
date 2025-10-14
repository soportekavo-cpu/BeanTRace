import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Salida, Mezcla, PurchaseReceipt, Client, Supplier, SalidaMezclaInput, SalidaReciboInput } from '../types';
import ToggleSwitch from './ToggleSwitch';
import { printComponent } from '../utils/printUtils';
import SalidaPDF from './SalidaPDF';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { useAuth } from '../contexts/AuthContext';

interface SalidaFormProps {
    existingSalida?: Salida | null;
    tipoSalida: 'mezclas' | 'recibos';
    onCancel: () => void;
    onSaveSuccess: () => void;
}

const SalidaForm: React.FC<SalidaFormProps> = ({ existingSalida, tipoSalida, onCancel, onSaveSuccess }) => {
    const { user } = useAuth();
    const isMezcla = tipoSalida === 'mezclas';
    const isEditMode = !!existingSalida;
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [isTaraOverridden, setIsTaraOverridden] = useState(false);

    const getInitialState = () => ({
        fecha: existingSalida?.fecha || new Date().toISOString().split('T')[0],
        placaVehiculo: existingSalida?.placaVehiculo || '',
        piloto: existingSalida?.piloto || '',
        isExportacion: existingSalida?.isExportacion || false,
        cartaPorte: existingSalida?.cartaPorte || '',
        partidas: existingSalida?.partidas || '',
        notas: existingSalida?.notas || '',
        tara: existingSalida?.tara?.toString() || '0',
        clienteId: existingSalida?.clienteId || '',
        selectedMezclas: isEditMode && existingSalida?.mezclas ? existingSalida.mezclas : [{ mezclaId: '', mezclaNumber: '', pesoUtilizado: 0, descripcionEnvio: '', sacosYute: 0, sacosNylon: 0 }],
        selectedRecibos: isEditMode && existingSalida?.recibos ? existingSalida.recibos.map(r => ({ ...r })) : [{ reciboId: '', reciboNumber: '', proveedorName: '', tipoCafe: '', pesoDevuelto: 0, descripcionDevolucion: '', sacosYute: 0, sacosNylon: 0 }],
    });
    
    const [formState, setFormState] = useState(getInitialState());

    // Data sources
    const [availableMezclas, setAvailableMezclas] = useState<Mezcla[]>([]);
    const [availableReceipts, setAvailableReceipts] = useState<PurchaseReceipt[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [mezclasData, clientsData, receiptsData, suppliersData] = await Promise.all([
                api.getCollection<Mezcla>('mezclas'),
                api.getCollection<Client>('clients'),
                api.getCollection<PurchaseReceipt>('purchaseReceipts', r => r.status === 'Activo'),
                api.getCollection<Supplier>('suppliers')
            ]);
            setAvailableMezclas(mezclasData);
            setClients(clientsData);
            setAvailableReceipts(receiptsData);
            setSuppliers(suppliersData);
        };
        fetchData();
    }, []);

    const calculations = useMemo(() => {
        let yuteNum = 0, nylonNum = 0, pesoNetoNum = 0;

        if (isMezcla) {
            pesoNetoNum = formState.selectedMezclas.reduce((sum, m) => sum + (Number(m.pesoUtilizado) || 0), 0);
            yuteNum = formState.selectedMezclas.reduce((sum, m) => sum + (Number(m.sacosYute) || 0), 0);
            nylonNum = formState.selectedMezclas.reduce((sum, m) => sum + (Number(m.sacosNylon) || 0), 0);
        } else {
            pesoNetoNum = formState.selectedRecibos.reduce((sum, r) => sum + (Number(r.pesoDevuelto) || 0), 0);
            yuteNum = formState.selectedRecibos.reduce((sum, r) => sum + (Number(r.sacosYute) || 0), 0);
            nylonNum = formState.selectedRecibos.reduce((sum, r) => sum + (Number(r.sacosNylon) || 0), 0);
        }

        const taraCalculada = (yuteNum * 0.02) + (nylonNum * 0.01);
        const taraManual = parseFloat(formState.tara) || 0;
        const tara = isTaraOverridden ? taraManual : taraCalculada;
        const pesoBruto = pesoNetoNum + tara;

        return { pesoNeto: pesoNetoNum, tara, pesoBruto, sacosYute: yuteNum, sacosNylon: nylonNum };
    }, [isMezcla, formState, isTaraOverridden]);
    
    useEffect(() => {
        if (!isTaraOverridden) {
            setFormState(prev => ({...prev, tara: calculations.tara.toFixed(2)}));
        }
    }, [calculations.tara, isTaraOverridden]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({...prev, [name]: value }));
    };

    const handleMezclaRowChange = (index: number, field: keyof (typeof formState.selectedMezclas)[0], value: string | number) => {
        const updated = [...formState.selectedMezclas];
        const currentMezcla = updated[index];
        
        if (field === 'mezclaId') {
            const selectedMezcla = availableMezclas.find(am => am.id === value);
            updated[index] = { ...currentMezcla, mezclaId: value as string, descripcionEnvio: selectedMezcla?.tipoMezcla || '', mezclaNumber: selectedMezcla?.mezclaNumber || '' };
        } else if (field === 'pesoUtilizado') {
            const selectedMezclaInfo = availableMezclas.find(am => am.id === currentMezcla.mezclaId);
            const oldUsage = isEditMode ? existingSalida?.mezclas?.find(em => em.mezclaId === currentMezcla.mezclaId)?.pesoUtilizado || 0 : 0;
            const maxWeight = (Number(selectedMezclaInfo?.sobranteEnBodega) || 0) + oldUsage;
            updated[index] = { ...currentMezcla, pesoUtilizado: Math.min(Number(value), maxWeight) };
        } else {
            updated[index] = { ...currentMezcla, [field]: value };
        }
        setFormState(prev => ({ ...prev, selectedMezclas: updated }));
    }

    const addMezclaRow = () => setFormState(prev => ({...prev, selectedMezclas: [...prev.selectedMezclas, { mezclaId: '', mezclaNumber: '', pesoUtilizado: 0, descripcionEnvio: '', sacosYute: 0, sacosNylon: 0 }]}));
    const removeMezclaRow = (index: number) => setFormState(prev => ({...prev, selectedMezclas: prev.selectedMezclas.filter((_, i) => i !== index)}));

    const handleReciboRowChange = (index: number, field: keyof (typeof formState.selectedRecibos)[0], value: string | number) => {
        const updated = [...formState.selectedRecibos];
        const currentRecibo = updated[index];
        
        if (field === 'reciboId') {
            const selectedReciboInfo = availableReceipts.find(r => r.id === value);
            const supplierName = suppliers.find(s => s.id === selectedReciboInfo?.proveedorId)?.name || '';
            const tipoCafe = selectedReciboInfo?.tipo === 'Otro' ? selectedReciboInfo?.customTipo || '' : selectedReciboInfo?.tipo || '';
            updated[index] = { ...currentRecibo, reciboId: value as string, reciboNumber: selectedReciboInfo?.recibo || '', proveedorName: supplierName, tipoCafe: tipoCafe };
        } else if (field === 'pesoDevuelto') {
            const selectedReciboInfo = availableReceipts.find(r => r.id === currentRecibo.reciboId);
            const oldUsage = isEditMode ? existingSalida?.recibos?.find(er => er.reciboId === currentRecibo.reciboId)?.pesoDevuelto || 0 : 0;
            const maxWeight = (Number(selectedReciboInfo?.enBodega) || 0) + oldUsage;
            updated[index] = { ...currentRecibo, pesoDevuelto: Math.min(Number(value), maxWeight) };
        } else {
            updated[index] = { ...currentRecibo, [field]: value };
        }
        setFormState(prev => ({...prev, selectedRecibos: updated}));
    }

    const addReciboRow = () => setFormState(prev => ({...prev, selectedRecibos: [...prev.selectedRecibos, { reciboId: '', reciboNumber: '', proveedorName: '', tipoCafe: '', pesoDevuelto: 0, descripcionDevolucion: '', sacosYute: 0, sacosNylon: 0 }]}));
    const removeReciboRow = (index: number) => setFormState(prev => ({...prev, selectedRecibos: prev.selectedRecibos.filter((_, i) => i !== index)}));

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            if (!formState.clienteId) {
                setError('Debe seleccionar a nombre de quién se hace el envío.');
                setIsSaving(false);
                return;
            }
            if (isMezcla) {
                 const hasValidMezclas = formState.selectedMezclas.some(r => r.mezclaId && r.pesoUtilizado > 0);
                 if (!hasValidMezclas) {
                    setError('Debe agregar al menos una mezcla a la salida.');
                    setIsSaving(false);
                    return;
                }
            } else {
                const hasValidRecibos = formState.selectedRecibos.some(r => r.reciboId && r.pesoDevuelto > 0);
                if (!hasValidRecibos) {
                    setError('Debe agregar al menos un recibo a la devolución.');
                    setIsSaving(false);
                    return;
                }
            }

            const salidaNumber = existingSalida?.salidaNumber || `Envio-${(await api.getCollection('salidas')).length + 1}`;
            
            const commonData = {
                salidaNumber, fecha: formState.fecha, placaVehiculo: formState.placaVehiculo, piloto: formState.piloto, isExportacion: formState.isExportacion, cartaPorte: formState.isExportacion ? formState.cartaPorte : '', partidas: formState.isExportacion ? formState.partidas : '', notas: formState.notas, ...calculations, status: 'Activo' as 'Activo',
            };

            let savedSalida: Salida;

            if (isMezcla) {
                const mezclasData: SalidaMezclaInput[] = formState.selectedMezclas.filter(m => m.mezclaId && m.pesoUtilizado > 0).map(m => ({
                    ...m, mezclaNumber: availableMezclas.find(am => am.id === m.mezclaId)?.mezclaNumber || '', pesoUtilizado: Number(m.pesoUtilizado) || 0, sacosYute: Number(m.sacosYute) || 0, sacosNylon: Number(m.sacosNylon) || 0,
                }));
                const data: Omit<Salida, 'id'> = { ...commonData, tipoSalida: 'Mezcla', clienteId: formState.clienteId, clienteName: clients.find(c => c.id === formState.clienteId)?.name, mezclas: mezclasData };
                savedSalida = isEditMode ? await api.updateDocument<Salida>('salidas', existingSalida!.id, data) : await api.addDocument<Salida>('salidas', data);
                
                const oldMezclaUsage = new Map(isEditMode ? existingSalida!.mezclas?.map(m => [m.mezclaId, m.pesoUtilizado]) : []);
                const newMezclaUsage = new Map(mezclasData.map(m => [m.mezclaId, m.pesoUtilizado]));
                const allAffectedMezclaIds = new Set([...oldMezclaUsage.keys(), ...newMezclaUsage.keys()]);
                for(const id of allAffectedMezclaIds) {
                    const mezcla = availableMezclas.find(m => m.id === id);
                    if (!mezcla) continue;
                    const diff = (newMezclaUsage.get(id) || 0) - (oldMezclaUsage.get(id) || 0);
                    if (diff === 0) continue;
                    const newSobrante = (Number(mezcla.sobranteEnBodega) || 0) - diff;
                    const newStatus: Mezcla['status'] = newSobrante <= 0.005 ? 'Agotado' : 'Despachado Parcialmente';
                    // FIX: Explicitly cast values to Number to ensure correct arithmetic operations.
                    await api.updateDocument<Mezcla>('mezclas', id, { 
                        cantidadDespachada: (Number(mezcla.cantidadDespachada) || 0) + Number(diff), 
                        sobranteEnBodega: newSobrante,
                        status: newStatus
                    });
                }
            } else { // Devolución Recibo
                const recibosData: SalidaReciboInput[] = formState.selectedRecibos.filter(r => r.reciboId && r.pesoDevuelto > 0).map(r => {
                    const receiptInfo = availableReceipts.find(ar => ar.id === r.reciboId);
                    const supplierName = suppliers.find(s => s.id === receiptInfo?.proveedorId)?.name || '';
                    const tipoCafe = receiptInfo?.tipo === 'Otro' ? receiptInfo?.customTipo || '' : receiptInfo?.tipo || '';
                    return {
                        ...r, reciboNumber: receiptInfo?.recibo || '', proveedorName: supplierName, tipoCafe: tipoCafe, pesoDevuelto: Number(r.pesoDevuelto) || 0, sacosYute: Number(r.sacosYute) || 0, sacosNylon: Number(r.sacosNylon) || 0,
                    }
                });

                const data: Omit<Salida, 'id'> = { ...commonData, tipoSalida: 'Devolución Recibo', clienteId: formState.clienteId, clienteName: clients.find(c => c.id === formState.clienteId)?.name, recibos: recibosData };
                savedSalida = isEditMode ? await api.updateDocument<Salida>('salidas', existingSalida!.id, data) : await api.addDocument<Salida>('salidas', data);
                
                const oldReciboUsage = new Map(isEditMode ? existingSalida!.recibos?.map(r => [r.reciboId, r.pesoDevuelto]) : []);
                const newReciboUsage = new Map(recibosData.map(r => [r.reciboId, r.pesoDevuelto]));
                const allAffectedReciboIds = new Set([...oldReciboUsage.keys(), ...newReciboUsage.keys()]);
                 for(const id of allAffectedReciboIds) {
                    const recibo = availableReceipts.find(r => r.id === id);
                    if (!recibo) continue;
                    const diff = (newReciboUsage.get(id) || 0) - (oldReciboUsage.get(id) || 0);
                    if (diff === 0) continue;
                    // FIX: Explicitly cast values to Number before arithmetic operation to prevent type errors.
                    await api.updateDocument<PurchaseReceipt>('purchaseReceipts', id, { devuelto: (Number(recibo.devuelto) || 0) + Number(diff), enBodega: (Number(recibo.enBodega) || 0) - Number(diff) });
                }
            }

            printComponent(<SalidaPDF salida={savedSalida} />, `Envio-${savedSalida.salidaNumber}`);
            onSaveSuccess();

        } catch(e) {
            console.error(e); setError('No se pudo guardar la salida. Verifique que todos los campos estén correctos.');
        } finally {
            setIsSaving(false);
        }
    }

    const selectedReciboIds = useMemo(() => new Set(formState.selectedRecibos.map(r => r.reciboId)), [formState.selectedRecibos]);
    const selectedMezclaIds = useMemo(() => new Set(formState.selectedMezclas.map(m => m.mezclaId)), [formState.selectedMezclas]);

    return (
        <div className="space-y-6">
             <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver</button>
            <h2 className="text-2xl font-bold text-foreground">{isEditMode ? 'Editar' : 'Registrar'} {isMezcla ? 'Salida de Mezcla' : 'Devolución de Recibo'}</h2>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-blue-600 mb-2 border-b pb-2">Información General</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Enviar a nombre de *</label>
                        <select name="clienteId" value={formState.clienteId} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input">
                            <option value="">Seleccionar Cliente...</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Fecha</label>
                        <input type="date" name="fecha" value={formState.fecha} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input" />
                    </div>
                 </div>
            </div>

             <div className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-4">
                 <h3 className="text-lg font-semibold text-orange-600 mb-2 border-b pb-2">Detalle de {isMezcla ? 'Envío' : 'Devolución'}</h3>
                {isMezcla ? (
                    <>
                        <table className="w-full text-sm">
                           <thead className="text-left text-muted-foreground whitespace-nowrap"><tr>
                               <th className="pb-2 w-[20%]">No. Mezcla</th>
                               <th className="pb-2 w-[15%]">Tipo</th>
                               <th className="pb-2 w-[25%]">Descripción para Envío</th><th className="pb-2 w-[15%]">Peso a Despachar</th>
                               <th className="pb-2 w-[10%]">Sacos Yute</th><th className="pb-2 w-[10%]">Sacos Nylon</th><th className="pb-2 w-[5%]"></th>
                           </tr></thead>
                           <tbody>
                                {formState.selectedMezclas.map((m, index) => {
                                    const selectedMezclaInfo = availableMezclas.find(am => am.id === m.mezclaId);
                                    const oldUsage = isEditMode ? existingSalida?.mezclas?.find(em => em.mezclaId === m.mezclaId)?.pesoUtilizado || 0 : 0;
                                    const maxWeight = (selectedMezclaInfo?.sobranteEnBodega || 0) + oldUsage;
                                    return (
                                     <tr key={index}>
                                        <td className="pr-2 align-top"><select value={m.mezclaId} onChange={e => handleMezclaRowChange(index, 'mezclaId', e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-background border-input"><option value="">Seleccionar...</option>{availableMezclas.filter(am => (!selectedMezclaIds.has(am.id) || m.mezclaId === am.id) && ((am.sobranteEnBodega > 0) || m.mezclaId === am.id) ).map(am => <option key={am.id} value={am.id}>{am.mezclaNumber}</option>)}</select></td>
                                        <td className="pr-2 align-top"><span className="block w-full mt-1 p-2 bg-muted/50 rounded-md h-[42px] leading-loose truncate">{selectedMezclaInfo?.tipoMezcla || '...'}</span></td>
                                        <td className="pr-2 align-top"><input type="text" value={m.descripcionEnvio} onChange={e => handleMezclaRowChange(index, 'descripcionEnvio', e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-background border-input" /></td>
                                        <td className="pr-2 align-top"><input type="number" value={m.pesoUtilizado || ''} onChange={e => handleMezclaRowChange(index, 'pesoUtilizado', Number(e.target.value))} max={maxWeight} className="w-full mt-1 p-2 border rounded-md bg-background border-input" placeholder={`En Bodega: ${maxWeight.toFixed(2)}`}/></td>
                                        <td className="pr-2 align-top"><input type="number" value={m.sacosYute || ''} onChange={e => handleMezclaRowChange(index, 'sacosYute', Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md bg-background border-input" /></td>
                                        <td className="pr-2 align-top"><input type="number" value={m.sacosNylon || ''} onChange={e => handleMezclaRowChange(index, 'sacosNylon', Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md bg-background border-input" /></td>
                                        <td className="align-top"><button onClick={() => removeMezclaRow(index)} className="mt-2"><TrashIcon className="w-5 h-5 text-red-500"/></button></td>
                                    </tr>
                                )})}
                           </tbody>
                        </table>
                        <div className="flex justify-between items-center"><button type="button" onClick={addMezclaRow} className="text-sm text-green-600 flex items-center gap-1"><PlusIcon className="w-4 h-4"/>Añadir Mezcla</button><div className="text-right font-semibold">Total Peso Neto: <span className="text-xl text-green-600">{calculations.pesoNeto.toFixed(2)} qqs.</span></div></div>
                    </>
                ) : ( // Devolución de Recibos
                    <>
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground whitespace-nowrap"><tr><th className="pb-2 w-[20%]">Recibo</th><th className="pb-2 w-[15%]">Tipo de Café</th><th className="pb-2 w-[20%]">Descripción</th><th className="pb-2 w-[15%]">Peso a Devolver</th><th className="pb-2 w-[10%]">Sacos Yute</th><th className="pb-2 w-[10%]">Sacos Nylon</th><th className="pb-2 w-[5%]"></th></tr></thead>
                            <tbody>
                                {formState.selectedRecibos.map((r, index) => {
                                    const selectedReciboInfo = availableReceipts.find(ar => ar.id === r.reciboId);
                                    const oldUsage = isEditMode ? existingSalida?.recibos?.find(er => er.reciboId === r.reciboId)?.pesoDevuelto || 0 : 0;
                                    const maxWeight = (Number(selectedReciboInfo?.enBodega) || 0) + oldUsage;
                                    return (
                                        <tr key={index}>
                                            <td className="pr-2 align-top">
                                                <select value={r.reciboId} onChange={e => handleReciboRowChange(index, 'reciboId', e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-background border-input">
                                                    <option value="">Seleccionar...</option>
                                                    {availableReceipts
                                                        .filter(ar => (!selectedReciboIds.has(ar.id) || ar.id === r.reciboId) && (ar.enBodega > 0 || ar.id === r.reciboId))
                                                        .map(ar => <option key={ar.id} value={ar.id}>{`${ar.recibo} (${suppliers.find(s=>s.id === ar.proveedorId)?.name})`}</option>)}
                                                </select>
                                            </td>
                                            <td className="pr-2 align-top">
                                                <span className="block w-full mt-1 p-2 bg-muted/50 rounded-md h-[42px] leading-loose truncate">{r.tipoCafe || '...'}</span>
                                            </td>
                                            <td className="pr-2 align-top"><input type="text" value={r.descripcionDevolucion} onChange={e => handleReciboRowChange(index, 'descripcionDevolucion', e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-background border-input" /></td>
                                            <td className="pr-2 align-top"><input type="number" value={r.pesoDevuelto || ''} onChange={e => handleReciboRowChange(index, 'pesoDevuelto', Number(e.target.value))} max={maxWeight} className="w-full mt-1 p-2 border rounded-md bg-background border-input" placeholder={`En Bodega: ${maxWeight.toFixed(2)}`} /></td>
                                            <td className="pr-2 align-top"><input type="number" value={r.sacosYute || ''} onChange={e => handleReciboRowChange(index, 'sacosYute', Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md bg-background border-input" /></td>
                                            <td className="pr-2 align-top"><input type="number" value={r.sacosNylon || ''} onChange={e => handleReciboRowChange(index, 'sacosNylon', Number(e.target.value))} className="w-full mt-1 p-2 border rounded-md bg-background border-input" /></td>
                                            <td className="align-top"><button onClick={() => removeReciboRow(index)} className="mt-2"><TrashIcon className="w-5 h-5 text-red-500"/></button></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="flex justify-between items-center"><button type="button" onClick={addReciboRow} className="text-sm text-green-600 flex items-center gap-1"><PlusIcon className="w-4 h-4"/>Añadir Recibo</button><div className="text-right font-semibold">Total Peso Neto: <span className="text-xl text-green-600">{calculations.pesoNeto.toFixed(2)} qqs.</span></div></div>
                    </>
                )}
             </div>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-4">
                <h3 className="text-lg font-semibold text-purple-600 mb-2 border-b pb-2">Detalle de Transporte y Empaque</h3>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div><label className="block text-sm font-medium text-muted-foreground mb-1">Sacos de Yute</label><p className="p-2 font-bold bg-muted/50 rounded-md">{calculations.sacosYute}</p></div>
                     <div><label className="block text-sm font-medium text-muted-foreground mb-1">Sacos de Nylon</label><p className="p-2 font-bold bg-muted/50 rounded-md">{calculations.sacosNylon}</p></div>
                     <div className="relative">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Tara</label>
                        <input name="tara" value={formState.tara} onChange={handleInputChange} disabled={!isTaraOverridden} className="w-full p-2 border rounded-md bg-background border-input font-bold disabled:bg-muted/50" />
                        {user?.role === 'Admin' && (
                            <div className="absolute top-1 right-2 flex items-center space-x-1">
                                <input id="taraOverride" type="checkbox" checked={isTaraOverridden} onChange={(e) => setIsTaraOverridden(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                <label htmlFor="taraOverride" className="text-xs text-muted-foreground select-none">Manual</label>
                            </div>
                        )}
                    </div>
                     <div><label className="block text-sm font-medium text-muted-foreground mb-1">Peso Bruto</label><p className="p-2 font-bold text-green-600 bg-green-500/10 rounded-md">{calculations.pesoBruto.toFixed(2)}</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                     <div><label className="block text-sm font-medium text-muted-foreground mb-1">Placa Vehículo</label><input name="placaVehiculo" value={formState.placaVehiculo} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                     <div><label className="block text-sm font-medium text-muted-foreground mb-1">Piloto</label><input name="piloto" value={formState.piloto} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                </div>
                 {isMezcla && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t items-center">
                        <div className="flex items-center gap-4">
                            <ToggleSwitch id="isExport" checked={formState.isExportacion} onChange={c => setFormState(p=>({...p, isExportacion: c}))} />
                            <label htmlFor="isExport" className="text-sm font-medium">¿Es Exportación?</label>
                        </div>
                        {formState.isExportacion && <>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">No. de Carta de Porte</label>
                                <input name="cartaPorte" value={formState.cartaPorte} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Partida(s)</label>
                                <input name="partidas" value={formState.partidas} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input"/>
                            </div>
                        </>}
                    </div>
                )}
                 <div className="pt-4 border-t"><label className="block text-sm font-medium text-muted-foreground mb-1">Notas</label><textarea name="notas" value={formState.notas} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md bg-background border-input"/></div>
            </div>
             {error && <p className="text-sm text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
             <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md">
                     {isSaving ? 'Guardando...' : 'Guardar e Imprimir'}
                </button>
            </div>
        </div>
    );
};

export default SalidaForm;
