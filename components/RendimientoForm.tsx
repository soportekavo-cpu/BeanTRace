
import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Rendimiento, ThreshingOrder, Viñeta, ByproductType, Contract, ContractLot, Reproceso } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { printComponent } from '../utils/printUtils';
import RendimientoPDF from './RendimientoPDF';
import CheckIcon from './icons/CheckIcon';

interface RendimientoFormProps {
    existingRendimiento?: Rendimiento | null;
    onCancel: () => void;
    onSaveSuccess: () => void;
}

const RendimientoForm: React.FC<RendimientoFormProps> = ({ existingRendimiento, onCancel, onSaveSuccess }) => {
    const isEditMode = !!existingRendimiento;
    const [availableOrders, setAvailableOrders] = useState<ThreshingOrder[]>([]);
    const [allContracts, setAllContracts] = useState<Contract[]>([]);
    const [allLots, setAllLots] = useState<ContractLot[]>([]);
    const [byproductTypes, setByproductTypes] = useState<ByproductType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set(existingRendimiento?.threshingOrderIds || []));
    const [vignettes, setVignettes] = useState<Partial<Viñeta>[]>(existingRendimiento?.vignettes.length ? existingRendimiento.vignettes : [{ id: `new_${Date.now()}`, numeroViñeta: '', tipo: '', pesoNeto: undefined, notas: '' }]);
    
    const [vignetteErrors, setVignetteErrors] = useState<Record<string, string>>({});
    const [existingVignetteNumbers, setExistingVignetteNumbers] = useState<Set<string>>(new Set());


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allOrders, allRendimientos, allReprocesos, allByproducts, contractsData, lotsData] = await Promise.all([
                    api.getCollection<ThreshingOrder>('threshingOrders'),
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos'),
                    api.getCollection<ByproductType>('byproductTypes'),
                    api.getCollection<Contract>('contracts'),
                    api.getCollection<ContractLot>('contractLots'),
                ]);
                
                const usedOrderIds = new Set(allRendimientos.flatMap(r => {
                    return (isEditMode && existingRendimiento && r.id === existingRendimiento.id) ? [] : r.threshingOrderIds;
                }));
                
                setAvailableOrders(allOrders.filter(o => !usedOrderIds.has(o.id)));
                setByproductTypes(allByproducts);
                setAllContracts(contractsData);
                setAllLots(lotsData);

                const existingNumbers = new Set<string>();
                allRendimientos.forEach(r => {
                    if (isEditMode && existingRendimiento && r.id === existingRendimiento.id) return;
                    r.vignettes.forEach(v => existingNumbers.add(v.numeroViñeta.trim()));
                });
                allReprocesos.forEach(r => {
                    r.outputVignettes.forEach(v => existingNumbers.add(v.numeroViñeta.trim()));
                });
                setExistingVignetteNumbers(existingNumbers);

            } catch (error) {
                console.error("Error fetching data for rendimiento form:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isEditMode, existingRendimiento]);

    const projectedData = useMemo(() => {
        const selectedOrders = availableOrders.filter(o => selectedOrderIds.has(o.id));
        const totalToThresh = selectedOrders.reduce((sum: number, o) => sum + o.totalToThresh, 0);
        const totalPrimeras = selectedOrders.reduce((sum: number, o) => sum + o.totalPrimeras, 0);
        const totalCatadura = selectedOrders.reduce((sum: number, o) => sum + o.totalCatadura, 0);
        return { totalToThresh, totalPrimeras, totalCatadura };
    }, [selectedOrderIds, availableOrders]);
    
    const realData = useMemo((): {
        summaryByType: Record<string, number>;
        totalRealPrimeras: number;
        totalRealCatadura: number;
        totalReal: number;
    } => {
        const summaryByType: Record<string, number> = {};
        let totalRealPrimeras = 0;
        let totalRealCatadura = 0;
        
        vignettes.forEach(v => {
            const peso = Number(v.pesoNeto) || 0;
            if (v.tipo) {
                summaryByType[v.tipo] = (summaryByType[v.tipo] || 0) + peso;
            }
            if (v.tipo === 'Primeras') {
                totalRealPrimeras += peso;
            } else {
                totalRealCatadura += peso;
            }
        });

        const totalReal = totalRealPrimeras + totalRealCatadura;
        return { summaryByType, totalRealPrimeras, totalRealCatadura, totalReal };
    }, [vignettes]);

    const handleOrderToggle = (orderId: string) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) newSet.delete(orderId);
            else newSet.add(orderId);
            return newSet;
        });
    };

    const validateVignetteNumber = (id: string, number: string, allVignettesInForm: Partial<Viñeta>[]) => {
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
    
    const handleVignetteChange = (id: string, field: keyof Viñeta, value: string) => {
        setVignettes(prevVignettes => {
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
                const error = validateVignetteNumber(id, value, newVignettes);
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


    const addVignetteRow = () => {
        setVignettes(prev => [...prev, { id: `new_${Date.now()}`, numeroViñeta: '', tipo: '', pesoNeto: undefined, notas: '' }]);
    };

    const removeVignetteRow = (id: string) => {
        setVignettes(prev => prev.length > 1 ? prev.filter(v => v.id !== id) : prev);
        setVignetteErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[id];
            return newErrors;
        });
    };

    const handleSave = async () => {
        const errors: Record<string, string> = {};
        let hasError = false;

        for (const v of vignettes) {
            const numError = validateVignetteNumber(v.id!, v.numeroViñeta || '', vignettes);
            if (numError) {
                errors[v.id!] = numError;
                hasError = true;
            }
            if (!v.tipo?.trim()) {
                errors[v.id!] = errors[v.id!] ? `${errors[v.id!]} El tipo es requerido.` : 'El tipo es requerido.';
                hasError = true;
            }
            if (v.pesoNeto === undefined || Number(v.pesoNeto) <= 0) {
                 errors[v.id!] = errors[v.id!] ? `${errors[v.id!]} El peso debe ser > 0.` : 'El peso debe ser > 0.';
                hasError = true;
            }
        }
        
        setVignetteErrors(errors);

        if (hasError || selectedOrderIds.size === 0) {
            if (selectedOrderIds.size === 0) alert("Selecciona al menos una orden de trilla.");
            return;
        }

        setIsSaving(true);
        try {
            const finalVignettes = vignettes.map(v => ({
                ...v,
                id: v.id!.startsWith('new_') ? api.generateId() : v.id,
                pesoNeto: Number(v.pesoNeto) || 0,
                originalPesoNeto: Number(v.pesoNeto) || 0,
                status: 'En Bodega'
            })) as Viñeta[];

            let rendimientoNumber = existingRendimiento?.rendimientoNumber;
            if (!isEditMode) {
                 const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
                const maxNum = allRendimientos.reduce((max, r) => {
                    if (!r.rendimientoNumber?.startsWith('REN-')) return max;
                    const num = parseInt(r.rendimientoNumber.split('-')[1]);
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0);
                rendimientoNumber = `REN-${maxNum + 1}`;
            }

            const data: Omit<Rendimiento, 'id'> & { rendimientoNumber: string } = {
                rendimientoNumber: rendimientoNumber!,
                creationDate: existingRendimiento?.creationDate || new Date().toISOString().split('T')[0],
                threshingOrderIds: Array.from(selectedOrderIds),
                vignettes: finalVignettes,
                totalProyectadoPrimeras: projectedData.totalPrimeras,
                totalProyectadoCatadura: projectedData.totalCatadura,
                totalRealPrimeras: realData.totalRealPrimeras,
                totalRealCatadura: realData.totalRealCatadura,
            };

            let savedRendimiento: Rendimiento;
            if (isEditMode) {
                savedRendimiento = await api.updateDocument<Rendimiento>('rendimientos', existingRendimiento!.id, data);
            } else {
                savedRendimiento = await api.addDocument<Rendimiento>('rendimientos', data);
            }
            
            const selectedOrdersForPrint = availableOrders.filter(o => selectedOrderIds.has(o.id));
            printComponent(
                <RendimientoPDF rendimiento={savedRendimiento} threshingOrders={selectedOrdersForPrint} />,
                `Rendimiento-${savedRendimiento.id}`
            );

            onSaveSuccess();

        } catch (error) {
            console.error("Error saving rendimiento:", error);
            alert("No se pudo guardar el rendimiento.");
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = Object.keys(vignetteErrors).length === 0 && selectedOrderIds.size > 0 && !isSaving;

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="space-y-6">
            <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver a Rendimientos</button>
            <h2 className="text-2xl font-bold text-foreground">{isEditMode ? 'Editar Rendimiento' : 'Crear Nuevo Rendimiento'}</h2>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-blue-600 mb-4">1. Órdenes de Trilla a Liquidar</h3>
                <div className="space-y-2">
                    {availableOrders.map(o => {
                        const isSelected = selectedOrderIds.has(o.id);
                        const contract = allContracts.find(c => c.id === o.contractId);
                        const lotNumbers = o.lotIds.map(id => allLots.find(l => l.id === id)?.partida || id).join(', ');
                        return (
                            <button key={o.id} type="button" onClick={() => handleOrderToggle(o.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 w-full text-left transition-colors ${isSelected ? 'bg-blue-500/10 border-blue-500' : 'bg-muted/50 border-border hover:border-gray-400'}`}>
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-background border border-border'}`}>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </span>
                                <div className="flex-grow text-left">
                                    <p className="font-semibold text-foreground">{o.orderNumber}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Partidas: {lotNumbers} | Café: {contract?.coffeeType || 'N/A'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
                 <div className="grid grid-cols-3 gap-4 mt-4 p-4 rounded-lg bg-muted/50">
                    <p><strong>Total a Trillar:</strong> {projectedData.totalToThresh.toFixed(2)}</p>
                    <p><strong>Primeras Proyectadas:</strong> {projectedData.totalPrimeras.toFixed(2)}</p>
                    <p><strong>Catadura Proyectada:</strong> {projectedData.totalCatadura.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-purple-600 mb-4">2. Resultado Físico de Trilla (Viñetas)</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="p-2 text-left w-1/4">No. Viñeta *</th>
                            <th className="p-2 text-left w-1/4">Tipo Subproducto *</th>
                            <th className="p-2 text-left w-1/4">Peso Neto (qqs.) *</th>
                            <th className="p-2 text-left w-1/4">Notas</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {vignettes.map(v => (
                            <tr key={v.id}>
                                <td className="p-1 align-top">
                                    <input type="text" value={v.numeroViñeta} onChange={e => handleVignetteChange(v.id!, 'numeroViñeta', e.target.value)} 
                                    className={`w-full p-2 border rounded-md bg-background ${vignetteErrors[v.id!]?.includes('viñeta') ? 'border-red-500' : 'border-input'}`} />
                                    {vignetteErrors[v.id!]?.includes('viñeta') && <p className="text-xs text-red-500 mt-1">{vignetteErrors[v.id!]}</p>}
                                </td>
                                <td className="p-1 align-top">
                                    <select value={v.tipo} onChange={e => handleVignetteChange(v.id!, 'tipo', e.target.value)} 
                                    className={`w-full p-2 border rounded-md bg-background ${vignetteErrors[v.id!]?.includes('tipo') ? 'border-red-500' : 'border-input'}`}>
                                        <option value="">Seleccionar...</option>
                                        {byproductTypes.map(t => <option key={t.id} value={t.tipo}>{t.tipo}</option>)}
                                    </select>
                                </td>
                                <td className="p-1 align-top">
                                    <input type="number" value={v.pesoNeto === undefined ? '' : v.pesoNeto} onChange={e => handleVignetteChange(v.id!, 'pesoNeto', e.target.value)} 
                                    className={`w-full p-2 border rounded-md bg-background ${vignetteErrors[v.id!]?.includes('peso') ? 'border-red-500' : 'border-input'}`} />
                                </td>
                                <td className="p-1 align-top"><input type="text" value={v.notas} onChange={e => handleVignetteChange(v.id!, 'notas', e.target.value)} className="w-full p-2 border rounded-md bg-background border-input" /></td>
                                <td className="p-1 align-top"><button onClick={() => removeVignetteRow(v.id!)} className="text-red-500 hover:text-red-700 mt-2"><TrashIcon className="w-4 h-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={addVignetteRow} className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md"><PlusIcon className="w-4 h-4" /> Agregar Viñeta</button>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-teal-600 mb-4">3. Resumen y Comparación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-foreground">Totales por Tipo de Subproducto</h4>
                        {Object.entries(realData.summaryByType).length > 0 ? Object.entries(realData.summaryByType).map(([tipo, total]) => (
                            <p key={tipo} className="flex justify-between"><span>{tipo}:</span> <strong>{total.toFixed(2)} qqs.</strong></p>
                        )) : <p className="text-sm text-muted-foreground">Sin viñetas ingresadas.</p>}
                    </div>
                     <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-foreground">Comparación Final</h4>
                        <table className="w-full text-sm">
                            <thead><tr className="font-bold"><td className="p-2">Concepto</td><td className="p-2 text-right">Proyectado</td><td className="p-2 text-right">Real</td><td className="p-2 text-right">Diferencia</td></tr></thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="p-2 font-semibold">Primeras</td>
                                    <td className="p-2 text-right">{projectedData.totalPrimeras.toFixed(2)}</td>
                                    <td className="p-2 text-right">{realData.totalRealPrimeras.toFixed(2)}</td>
                                    <td className={`p-2 text-right font-bold ${realData.totalRealPrimeras - projectedData.totalPrimeras < -0.005 ? 'text-red-500' : 'text-green-600'}`}>
                                        {/* FIX: Cast to Number to ensure toFixed method is available. */}
                                        {(Number(realData.totalRealPrimeras) - Number(projectedData.totalPrimeras)).toFixed(2)}
                                    </td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-2 font-semibold">Catadura</td>
                                    <td className="p-2 text-right">{projectedData.totalCatadura.toFixed(2)}</td>
                                    <td className="p-2 text-right">{realData.totalRealCatadura.toFixed(2)}</td>
                                     <td className={`p-2 text-right font-bold ${realData.totalRealCatadura - projectedData.totalCatadura < -0.005 ? 'text-red-500' : 'text-green-600'}`}>
                                        {/* FIX: Cast to Number to ensure toFixed method is available. */}
                                        {(Number(realData.totalRealCatadura) - Number(projectedData.totalCatadura)).toFixed(2)}
                                     </td>
                                </tr>
                                <tr className="font-bold bg-muted">
                                    <td className="p-2">Total</td>
                                    <td className="p-2 text-right">{(projectedData.totalPrimeras + projectedData.totalCatadura).toFixed(2)}</td>
                                    <td className="p-2 text-right">{realData.totalReal.toFixed(2)}</td>
                                    <td className="p-2 text-right">{((realData.totalRealPrimeras + realData.totalRealCatadura) - (projectedData.totalPrimeras + projectedData.totalCatadura)).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

             <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={!canSave} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                    {isSaving ? 'Guardando...' : 'Guardar y Imprimir'}
                </button>
            </div>
        </div>
    );
};

export default RendimientoForm;