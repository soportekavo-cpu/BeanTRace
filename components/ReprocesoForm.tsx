import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Reproceso, Viñeta, ByproductType, Rendimiento } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SelectVignettesModal from './SelectVignettesModal';
import { printComponent } from '../utils/printUtils';
import ReprocesoPDF from './ReprocesoPDF';
import { useAuth } from '../contexts/AuthContext';
import ToggleSwitch from './ToggleSwitch';

interface ReprocesoFormProps {
    existingReproceso?: Reproceso | null;
    onCancel: () => void;
    onSaveSuccess: () => void;
}

const ReprocesoForm: React.FC<ReprocesoFormProps> = ({ existingReproceso, onCancel, onSaveSuccess }) => {
    const { roleDetails } = useAuth();
    const permissions = roleDetails?.permissions.reprocesos;
    const canEditEntrada = permissions?.editEntrada === true;
    const canEditSalida = permissions?.editSalida === true;

    const isEditMode = !!existingReproceso;
    const [byproductTypes, setByproductTypes] = useState<ByproductType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showVignetteSelector, setShowVignetteSelector] = useState(false);

    const [inputVignettes, setInputVignettes] = useState<Viñeta[]>(existingReproceso?.inputVignettesData || []);
    const [outputVignettes, setOutputVignettes] = useState<Partial<Viñeta>[]>(
        existingReproceso?.outputVignettes.length ? existingReproceso.outputVignettes : [{ id: `new_${Date.now()}`, numeroViñeta: '', tipo: '', pesoNeto: undefined }]
    );
    const [notes, setNotes] = useState(existingReproceso?.notes || '');
    const [isFinalizado, setIsFinalizado] = useState(existingReproceso?.isFinalizado || false);
    const [hasChanged, setHasChanged] = useState(false);
    const [projections, setProjections] = useState<Record<string, { prim: string; cata: string }>>({});
    
    const [vignetteErrors, setVignetteErrors] = useState<Record<string, string>>({});
    const [existingVignetteNumbers, setExistingVignetteNumbers] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [byproducts, allRendimientos, allReprocesos] = await Promise.all([
                    api.getCollection<ByproductType>('byproductTypes'),
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos')
                ]);
                setByproductTypes(byproducts);

                if (isEditMode && existingReproceso?.inputVignetteProjections) {
                    const initialProjections: Record<string, { prim: string; cata: string }> = {};
                    for (const id in existingReproceso.inputVignetteProjections) {
                        initialProjections[id] = {
                            prim: existingReproceso.inputVignetteProjections[id].porcentajePrimeras.toString(),
                            cata: existingReproceso.inputVignetteProjections[id].porcentajeCatadura.toString(),
                        };
                    }
                    setProjections(initialProjections);
                }

                const existingNumbers = new Set<string>();
                allRendimientos.forEach(r => {
                    r.vignettes.forEach(v => existingNumbers.add(v.numeroViñeta.trim()));
                });
                allReprocesos.forEach(r => {
                    if (isEditMode && existingReproceso && r.id === existingReproceso.id) return;
                    r.outputVignettes.forEach(v => existingNumbers.add(v.numeroViñeta.trim()));
                });
                setExistingVignetteNumbers(existingNumbers);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isEditMode, existingReproceso]);
    
    const projectedTotals = useMemo(() => {
        let totalPrimeras = 0;
        let totalCatadura = 0;
        inputVignettes.forEach(v => {
            const proj = projections[v.id];
            if (proj) {
                const primPercent = parseFloat(proj.prim) || 0;
                const cataPercent = parseFloat(proj.cata) || 0;
                totalPrimeras += v.pesoNeto * (primPercent / 100);
                totalCatadura += v.pesoNeto * (cataPercent / 100);
            }
        });
        return { totalPrimeras, totalCatadura };
    }, [inputVignettes, projections]);


    const realTotals = useMemo(() => {
        const totalInputWeight = inputVignettes.reduce((sum, v) => sum + v.pesoNeto, 0);
        
        const outputSummary = outputVignettes.reduce((acc, v) => {
            const peso = Number(v.pesoNeto) || 0;
            acc.totalWeight += peso;
            if (v.tipo?.toLowerCase().includes('primeras')) {
                acc.totalPrimeras += peso;
            } else if (v.tipo) {
                acc.totalCatadura += peso;
            }
            return acc;
        }, { totalWeight: 0, totalPrimeras: 0, totalCatadura: 0});

        const merma = totalInputWeight - outputSummary.totalWeight;
        return { totalInputWeight, ...outputSummary, merma };
    }, [inputVignettes, outputVignettes]);

    const handleSelectVignettes = (selected: Viñeta[]) => {
        setInputVignettes(selected);
        setShowVignetteSelector(false);
        setHasChanged(true);
    };

    const validateOutputVignetteNumber = (id: string, number: string, allVignettesInForm: Partial<Viñeta>[]) => {
        const trimmedNumber = number?.trim();
        if (!trimmedNumber) return 'El No. de viñeta es requerido.';
        if (allVignettesInForm.some(v => v.id !== id && v.numeroViñeta?.trim() === trimmedNumber)) {
            return 'No. de viñeta duplicado en este formulario.';
        }
        if (existingVignetteNumbers.has(trimmedNumber)) {
            return 'Este No. de viñeta ya existe en el sistema.';
        }
        return '';
    };

    const handleOutputVignetteChange = (id: string, field: keyof Viñeta, value: string) => {
        setHasChanged(true);
        setOutputVignettes(prevVignettes => {
            const newVignettes = prevVignettes.map(v => {
                if (v.id === id) {
                    if (field === 'pesoNeto') {
                        const numValue = parseFloat(value);
                        return { ...v, pesoNeto: isNaN(numValue) ? undefined : numValue };
                    }
                    return { ...v, [field]: value };
                }
                return v;
            });

            if (field === 'numeroViñeta') {
                const error = validateOutputVignetteNumber(id, value, newVignettes);
                 setVignetteErrors(prevErrors => {
                    const newErrors = { ...prevErrors };
                    if (error) {
                        newErrors[id] = error;
                    } else {
                        delete newErrors[id];
                    }
                    return newErrors;
                });
            }
            return newVignettes;
        });
    };

    const addOutputRow = () => {
        setHasChanged(true);
        setOutputVignettes(prev => [...prev, { id: `new_${Date.now()}`, numeroViñeta: '', tipo: '', pesoNeto: undefined }]);
    };
    
    const removeOutputRow = (id: string) => {
        setHasChanged(true);
        setOutputVignettes(prev => prev.length > 1 ? prev.filter(v => v.id !== id) : prev);
        setVignetteErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[id];
            return newErrors;
        });
    };

    const handleProjectionChange = (id: string, field: 'prim' | 'cata', value: string) => {
        const newValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
        const otherField = field === 'prim' ? 'cata' : 'prim';

        setProjections(prev => {
            const currentProjections = prev[id] || { prim: '0', cata: '0' };
            const otherValue = parseFloat(currentProjections[otherField]) || 0;
            let newOtherValue = otherValue;

            if (newValue + otherValue > 100) {
                newOtherValue = 100 - newValue;
            }
            
            const newPrim = field === 'prim' ? newValue.toString() : newOtherValue.toString();
            const newCata = field === 'cata' ? newValue.toString() : newOtherValue.toString();

            return {
                ...prev,
                [id]: {
                    prim: newPrim,
                    cata: newCata
                }
            };
        });
        setHasChanged(true);
    };

    const handleCancel = () => {
        if (hasChanged && !window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?')) {
            return;
        }
        onCancel();
    };

    const handleSave = async () => {
        const errors: Record<string, string> = {};
        let hasError = false;

        if (inputVignettes.length === 0) {
            alert('Debe seleccionar al menos una viñeta de entrada.');
            return;
        }

        for (const v of outputVignettes) {
             const numError = validateOutputVignetteNumber(v.id!, v.numeroViñeta || '', outputVignettes);
            if (numError) {
                errors[v.id!] = numError;
                hasError = true;
            }
            if (!v.tipo?.trim()) {
                errors[v.id!] = errors[v.id!] ? `${errors[v.id!]} El tipo es requerido.` : 'El tipo es requerido.';
                hasError = true;
            }
             if (v.pesoNeto === undefined || v.pesoNeto <= 0) {
                 errors[v.id!] = errors[v.id!] ? `${errors[v.id!]} El peso debe ser > 0.` : 'El peso debe ser > 0.';
                hasError = true;
            }
        }
        
        setVignetteErrors(errors);
        if (hasError) return;
        
        setIsSaving(true);
        try {
            const updateVignettesStatus = async (vignettesToUpdate: Viñeta[], newStatus: Viñeta['status']) => {
                const vignetteIdsToUpdate = new Set(vignettesToUpdate.map(v => v.id));
                if (vignetteIdsToUpdate.size === 0) return;
    
                const [allRendimientos, allReprocesos] = await Promise.all([
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos'),
                ]);
    
                const promises: Promise<any>[] = [];
    
                allRendimientos.forEach(r => {
                    let wasModified = false;
                    const updatedVignettes = r.vignettes.map(v => {
                        if (vignetteIdsToUpdate.has(v.id)) {
                            wasModified = true;
                            return { ...v, status: newStatus };
                        }
                        return v;
                    });
                    if (wasModified) {
                        promises.push(api.updateDocument<Rendimiento>('rendimientos', r.id, { vignettes: updatedVignettes }));
                    }
                });
    
                allReprocesos.forEach(r => {
                    if (isEditMode && existingReproceso && r.id === existingReproceso.id) return;
                    let wasModified = false;
                    const updatedVignettes = r.outputVignettes.map(v => {
                        if (vignetteIdsToUpdate.has(v.id)) {
                            wasModified = true;
                            return { ...v, status: newStatus };
                        }
                        return v;
                    });
                    if (wasModified) {
                        promises.push(api.updateDocument<Reproceso>('reprocesos', r.id, { outputVignettes: updatedVignettes }));
                    }
                });
    
                await Promise.all(promises);
            };

            const finalProjections: Record<string, { porcentajePrimeras: number; porcentajeCatadura: number }> = {};
             for (const id in projections) {
                 finalProjections[id] = {
                     porcentajePrimeras: parseFloat(projections[id].prim) || 0,
                     porcentajeCatadura: parseFloat(projections[id].cata) || 0,
                 };
             }

            if (isEditMode && existingReproceso) {
                 const originalInputVignettes = existingReproceso.inputVignettesData;
                const new_input_vignette_ids = new Set(inputVignettes.map(v => v.id));
                const removed_input_vignettes = originalInputVignettes.filter(v => !new_input_vignette_ids.has(v.id));
                await updateVignettesStatus(removed_input_vignettes, 'En Bodega');

                const original_input_vignette_ids = new Set(originalInputVignettes.map(v => v.id));
                const added_input_vignettes = inputVignettes.filter(v => !original_input_vignette_ids.has(v.id));
                await updateVignettesStatus(added_input_vignettes, 'Reprocesado');
                
                const existingOutputVignettesMap: Map<string, Viñeta> = new Map(existingReproceso.outputVignettes.map(v => [v.id, v]));
                const newOutputVignetteIds = new Set(outputVignettes.map(v => v.id));
                
                for (const [id, vignette] of existingOutputVignettesMap.entries()) {
                    if (!newOutputVignetteIds.has(id) && vignette.status !== 'En Bodega') {
                        alert(`No se puede eliminar la viñeta de salida ${vignette.numeroViñeta} porque ya ha sido utilizada en otro proceso.`);
                        setIsSaving(false);
                        return;
                    }
                }

                const finalOutputVignettes = outputVignettes.map(v => {
                    const existing = existingOutputVignettesMap.get(v.id!);
                    const pesoNeto = Number(v.pesoNeto) || 0;
                    return {
                        ...v,
                        id: v.id!.startsWith('new_') ? api.generateId() : v.id!,
                        pesoNeto: pesoNeto,
                        originalPesoNeto: existing ? existing.originalPesoNeto : pesoNeto,
                        status: existing ? existing.status : 'En Bodega'
                    } as Viñeta;
                });

                const data: Partial<Reproceso> = {
                    inputVignetteIds: inputVignettes.map(v => v.id),
                    inputVignettesData: inputVignettes,
                    outputVignettes: finalOutputVignettes,
                    totalInputWeight: realTotals.totalInputWeight,
                    totalOutputWeight: realTotals.totalWeight,
                    merma: realTotals.merma,
                    notes,
                    isFinalizado,
                    inputVignetteProjections: finalProjections,
                    totalProyectadoPrimeras: projectedTotals.totalPrimeras,
                    totalProyectadoCatadura: projectedTotals.totalCatadura,
                    totalRealPrimeras: realTotals.totalPrimeras,
                    totalRealCatadura: realTotals.totalCatadura,
                };
                await api.updateDocument<Reproceso>('reprocesos', existingReproceso.id, data);
            } else {
                await updateVignettesStatus(inputVignettes, 'Reprocesado');

                const finalOutputVignettes = outputVignettes.map(v => {
                    const pesoNeto = Number(v.pesoNeto) || 0;
                    return {
                        ...v,
                        id: v.id!.startsWith('new_') ? api.generateId() : v.id,
                        pesoNeto: pesoNeto,
                        originalPesoNeto: pesoNeto,
                        status: 'En Bodega'
                    } as Viñeta
                });
    
                const allReprocesos = await api.getCollection<Reproceso>('reprocesos');
                const maxNum = allReprocesos.reduce((max, r) => {
                    if (!r.reprocesoNumber?.startsWith('RP-')) return max;
                    const num = parseInt(r.reprocesoNumber.split('-')[1]);
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0);
                const reprocesoNumber = `RP-${maxNum + 1}`;
    
                const data: Omit<Reproceso, 'id'> = {
                    reprocesoNumber,
                    creationDate: new Date().toISOString().split('T')[0],
                    inputVignetteIds: inputVignettes.map(v => v.id),
                    inputVignettesData: inputVignettes,
                    outputVignettes: finalOutputVignettes,
                    totalInputWeight: realTotals.totalInputWeight,
                    totalOutputWeight: realTotals.totalWeight,
                    merma: realTotals.merma,
                    notes,
                    status: 'Activo',
                    isFinalizado,
                    inputVignetteProjections: finalProjections,
                    totalProyectadoPrimeras: projectedTotals.totalPrimeras,
                    totalProyectadoCatadura: projectedTotals.totalCatadura,
                    totalRealPrimeras: realTotals.totalPrimeras,
                    totalRealCatadura: realTotals.totalCatadura,
                };
    
                const savedReproceso = await api.addDocument<Reproceso>('reprocesos', data);
                printComponent(<ReprocesoPDF reproceso={savedReproceso} />, `Reproceso-${savedReproceso.reprocesoNumber}`);
            }

            onSaveSuccess();

        } catch (error) {
            console.error("Error saving reproceso:", error);
            alert('Hubo un error al guardar el reproceso.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const canSave = Object.keys(vignetteErrors).length === 0 && inputVignettes.length > 0 && !isSaving && (canEditEntrada || canEditSalida);

    return (
        <div className="space-y-6">
            <button onClick={handleCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver</button>
            <h2 className="text-2xl font-bold text-foreground">{isEditMode ? `Editar Reproceso ${existingReproceso!.reprocesoNumber}` : 'Nuevo Reproceso'}</h2>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-blue-600 mb-4">1. Viñetas de Entrada y Proyección de Rendimiento</h3>
                <button type="button" onClick={() => setShowVignetteSelector(true)} disabled={!canEditEntrada} className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                    {isEditMode ? 'Editar Viñetas de Entrada' : 'Seleccionar Viñetas del Inventario'}
                </button>
                {inputVignettes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground whitespace-nowrap">
                                <tr>
                                    <th className="p-2">No. Viñeta</th>
                                    <th className="p-2">Tipo</th>
                                    <th className="p-2 text-right">Peso Neto</th>
                                    <th className="p-2">% Primeras</th>
                                    <th className="p-2">% Catadura</th>
                                    <th className="p-2 text-right">Proy. Primeras</th>
                                    <th className="p-2 text-right">Proy. Catadura</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inputVignettes.map(v => {
                                    const proj = projections[v.id] || { prim: '', cata: '' };
                                    const primProyectado = v.pesoNeto * (parseFloat(proj.prim) / 100 || 0);
                                    const cataProyectado = v.pesoNeto * (parseFloat(proj.cata) / 100 || 0);
                                    return (
                                        <tr key={v.id} className="border-b">
                                            <td className="p-2 font-semibold text-red-500">{v.numeroViñeta}</td>
                                            <td className="p-2">{v.tipo}</td>
                                            <td className="p-2 text-right">{v.pesoNeto.toFixed(2)}</td>
                                            <td className="p-2 w-28"><input type="number" value={proj.prim} onChange={e => handleProjectionChange(v.id, 'prim', e.target.value)} disabled={!canEditEntrada} className="w-full p-1 border rounded-md bg-background border-input text-right disabled:bg-muted/50" /></td>
                                            <td className="p-2 w-28"><input type="number" value={proj.cata} onChange={e => handleProjectionChange(v.id, 'cata', e.target.value)} disabled={!canEditEntrada} className="w-full p-1 border rounded-md bg-background border-input text-right disabled:bg-muted/50" /></td>
                                            <td className="p-2 text-right font-medium">{primProyectado.toFixed(2)}</td>
                                            <td className="p-2 text-right font-medium">{cataProyectado.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                             <tfoot className="font-bold bg-muted/50">
                                <tr>
                                    <td colSpan={2} className="p-2 text-right">Totales:</td>
                                    <td className="p-2 text-right">{realTotals.totalInputWeight.toFixed(2)}</td>
                                    <td colSpan={2}></td>
                                    <td className="p-2 text-right">{projectedTotals.totalPrimeras.toFixed(2)}</td>
                                    <td className="p-2 text-right">{projectedTotals.totalCatadura.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-purple-600 mb-4">2. Viñetas de Salida (Resultado del Reproceso)</h3>
                 <table className="w-full text-sm">
                    <thead><tr><th className="p-2 text-left">No. Viñeta *</th><th className="p-2 text-left">Tipo *</th><th className="p-2 text-left">Peso Neto *</th><th></th></tr></thead>
                    <tbody>
                        {outputVignettes.map(v => (
                            <tr key={v.id}>
                                <td className="p-1 align-top">
                                    <input type="text" value={v.numeroViñeta} onChange={e => handleOutputVignetteChange(v.id!, 'numeroViñeta', e.target.value)} disabled={!canEditSalida}
                                    className={`w-full p-2 border rounded-md bg-background disabled:bg-muted/50 ${vignetteErrors[v.id!]?.includes('viñeta') ? 'border-red-500' : 'border-input'}`} />
                                    {vignetteErrors[v.id!]?.includes('viñeta') && <p className="text-xs text-red-500 mt-1">{vignetteErrors[v.id!]}</p>}
                                </td>
                                <td className="p-1 align-top">
                                    <select value={v.tipo} onChange={e => handleOutputVignetteChange(v.id!, 'tipo', e.target.value)} disabled={!canEditSalida}
                                    className={`w-full p-2 border rounded-md bg-background disabled:bg-muted/50 ${vignetteErrors[v.id!]?.includes('tipo') ? 'border-red-500' : 'border-input'}`}>
                                        <option value="">Seleccionar...</option>{byproductTypes.map(t => <option key={t.id} value={t.tipo}>{t.tipo}</option>)}
                                    </select>
                                </td>
                                <td className="p-1 align-top">
                                    <input type="number" value={v.pesoNeto === undefined ? '' : v.pesoNeto} onChange={e => handleOutputVignetteChange(v.id!, 'pesoNeto', e.target.value)} disabled={!canEditSalida}
                                    className={`w-full p-2 border rounded-md bg-background disabled:bg-muted/50 ${vignetteErrors[v.id!]?.includes('peso') ? 'border-red-500' : 'border-input'}`} />
                                </td>
                                <td className="p-1 align-top"><button onClick={() => removeOutputRow(v.id!)} disabled={!canEditSalida} className="text-red-500 mt-2 disabled:text-gray-400"><TrashIcon className="w-4 h-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={addOutputRow} disabled={!canEditSalida} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"><PlusIcon className="w-4 h-4" /> Agregar Viñeta</button>
            </div>

            <div className="bg-card border-2 border-green-500/50 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-teal-600 mb-4">3. Resumen, Finalización y Notas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                         <div className={`p-4 rounded-lg text-center ${realTotals.merma > 0.005 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                            <p className={`text-sm font-semibold ${realTotals.merma > 0.005 ? 'text-red-800' : 'text-green-800'}`}>Merma (Diferencia)</p>
                            <p className={`text-4xl font-bold ${realTotals.merma > 0.005 ? 'text-red-600' : 'text-green-600'}`}>{realTotals.merma.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Total Entrada: {realTotals.totalInputWeight.toFixed(2)} qqs.</p>
                        </div>
                         <div>
                             <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">Notas</label>
                             <textarea id="notes" value={notes} onChange={(e) => { setNotes(e.target.value); setHasChanged(true); }} disabled={!canEditEntrada && !canEditSalida} rows={4} className="w-full p-2 border rounded-md bg-background border-input disabled:bg-muted/50" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                                 <p className="font-medium text-foreground">Marcar como Finalizado</p>
                                 <p className="text-xs text-muted-foreground">Bloquea la edición para no-administradores.</p>
                             </div>
                             <ToggleSwitch
                                 id="isFinalizado"
                                 checked={isFinalizado}
                                 onChange={setIsFinalizado}
                                 disabled={!roleDetails?.permissions.reprocesos?.canFinalize}
                             />
                         </div>
                    </div>
                     <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-foreground">Comparación de Rendimiento</h4>
                        <table className="w-full text-sm">
                            <thead><tr className="font-bold"><td className="pb-1">Concepto</td><td className="pb-1 text-right">Proyectado</td><td className="pb-1 text-right">Real</td><td className="pb-1 text-right">Diferencia</td></tr></thead>
                            <tbody>
                                <tr className="border-t"><td className="pt-2 font-semibold">Primeras</td>
                                    <td className="pt-2 text-right text-xl font-bold">{projectedTotals.totalPrimeras.toFixed(2)}</td>
                                    <td className="pt-2 text-right text-xl font-bold">{realTotals.totalPrimeras.toFixed(2)}</td>
                                    <td className={`pt-2 text-right text-xl font-bold ${(realTotals.totalPrimeras || 0) - projectedTotals.totalPrimeras < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{((realTotals.totalPrimeras || 0) - projectedTotals.totalPrimeras).toFixed(2)}</td>
                                </tr>
                                <tr><td className="pb-2 font-semibold">Catadura</td>
                                    <td className="pb-2 text-right text-xl font-bold">{(projectedTotals.totalCatadura || 0).toFixed(2)}</td>
                                    <td className="pb-2 text-right text-xl font-bold">{(realTotals.totalCatadura || 0).toFixed(2)}</td>
                                    <td className={`pb-2 text-right text-xl font-bold ${(realTotals.totalCatadura || 0) - (projectedTotals.totalCatadura || 0) < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{((realTotals.totalCatadura || 0) - (projectedTotals.totalCatadura || 0)).toFixed(2)}</td>
                                </tr>
                                <tr className="font-bold border-t">
                                    <td className="pt-2">Total Salida</td>
                                    <td className="pt-2 text-right text-xl">{((projectedTotals.totalPrimeras || 0) + (projectedTotals.totalCatadura || 0)).toFixed(2)}</td>
                                    <td className="pt-2 text-right text-xl">{realTotals.totalWeight.toFixed(2)}</td>
                                    <td className="pt-2 text-right text-xl">{(realTotals.totalWeight - ((projectedTotals.totalPrimeras || 0) + (projectedTotals.totalCatadura || 0))).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={handleCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={!canSave} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                    {isSaving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Guardar y Imprimir')}
                </button>
            </div>
            
            {showVignetteSelector && (
                <SelectVignettesModal 
                    onClose={() => setShowVignetteSelector(false)} 
                    onSelect={handleSelectVignettes}
                    initialSelectedIds={inputVignettes.map(v => v.id)}
                    existingReproceso={existingReproceso}
                />
            )}
        </div>
    );
};

export default ReprocesoForm;