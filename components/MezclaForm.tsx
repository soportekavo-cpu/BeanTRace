
















import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Mezcla, Viñeta, Rendimiento, Reproceso, MezclaVignetteInput } from '../types';
import SelectVignettesModal from './SelectVignettesModal';
import { printComponent } from '../utils/printUtils';
import MezclaPDF from './MezclaPDF';
import TrashIcon from './icons/TrashIcon';

interface MezclaFormProps {
    existingMezcla?: Mezcla | null;
    onCancel: () => void;
    onSaveSuccess: () => void;
}

const MezclaForm: React.FC<MezclaFormProps> = ({ existingMezcla, onCancel, onSaveSuccess }) => {
    const isEditMode = !!existingMezcla;
    const [isSaving, setIsSaving] = useState(false);
    const [showVignetteSelector, setShowVignetteSelector] = useState(false);
    const [error, setError] = useState('');
    
    const [allVignettes, setAllVignettes] = useState<Viñeta[]>([]);
    const [selectedVignettes, setSelectedVignettes] = useState<Viñeta[]>([]);
    const [weightsToUse, setWeightsToUse] = useState<Record<string, number>>({});

    const [tipoMezcla, setTipoMezcla] = useState(existingMezcla?.tipoMezcla || '');
    const [notes, setNotes] = useState(existingMezcla?.notes || '');

     useEffect(() => {
        const fetchAndSetInitialState = async () => {
            const [rendimientos, reprocesos] = await Promise.all([
                api.getCollection<Rendimiento>('rendimientos'),
                api.getCollection<Reproceso>('reprocesos')
            ]);
            const vignettesFromRendimientos = rendimientos.flatMap(r => r.vignettes);
            const vignettesFromReprocesos = reprocesos.flatMap(r => r.outputVignettes);
            const combined = [...vignettesFromRendimientos, ...vignettesFromReprocesos];
            setAllVignettes(combined);

            if (isEditMode && existingMezcla) {
                const initialVignettes = existingMezcla.inputVignettesData.map(iv => {
                    const originalVignette = combined.find(v => v.id === iv.vignetteId);
                    // FIX: Ensured all operands are treated as numbers before performing arithmetic operations.
                    const originalPesoNeto = originalVignette ? Number(originalVignette.pesoNeto || 0) : 0;
                    const pesoUtilizadoNum = Number(iv.pesoUtilizado || 0);
                    const pesoNetoForEditing = originalPesoNeto + pesoUtilizadoNum;

                    return {
                        ...(originalVignette || {}),
                        id: iv.vignetteId,
                        numeroViñeta: iv.vignetteNumber,
                        tipo: iv.tipo,
                        pesoNeto: pesoNetoForEditing,
                    } as Viñeta;
                });
                const initialWeights = Object.fromEntries(
                    existingMezcla.inputVignettesData.map(iv => [iv.vignetteId, iv.pesoUtilizado])
                );
                setSelectedVignettes(initialVignettes);
                setWeightsToUse(initialWeights);
            }
        };
        fetchAndSetInitialState();
    }, [isEditMode, existingMezcla]);

    const totals = useMemo(() => {
        const totalInputWeight = Object.values(weightsToUse).reduce((sum, weight) => sum + (Number(weight) || 0), 0);
        const despachado = existingMezcla?.cantidadDespachada || 0;
        const sobrante = totalInputWeight - despachado;
        return { totalInputWeight, sobrante };
    }, [weightsToUse, existingMezcla]);

    const compositionSummary = useMemo(() => {
        if (totals.totalInputWeight === 0) return [];

        const composition: Record<string, number> = {};
        selectedVignettes.forEach(v => {
            const weight = weightsToUse[v.id] || 0;
            if (weight > 0) {
                composition[v.tipo] = (composition[v.tipo] || 0) + weight;
            }
        });

        return Object.entries(composition).map(([tipo, peso]) => ({
            tipo,
            peso,
            porcentaje: (peso / totals.totalInputWeight) * 100,
        })).sort((a, b) => b.peso - a.peso);
    }, [selectedVignettes, weightsToUse, totals.totalInputWeight]);

    const handleSelectVignettes = (vignettes: Viñeta[]) => {
        setSelectedVignettes(vignettes);
        const newWeights: Record<string, number> = {};
        vignettes.forEach(v => {
            newWeights[v.id] = weightsToUse[v.id] !== undefined ? weightsToUse[v.id] : v.pesoNeto;
        });
        setWeightsToUse(newWeights);
        setShowVignetteSelector(false);
    };

    const handleWeightChange = (id: string, value: string) => {
        const vignette = selectedVignettes.find(v => v.id === id);
        if (!vignette) return;
        
        const amount = Math.max(0, Math.min(parseFloat(value) || 0, vignette.pesoNeto));
        setWeightsToUse(prev => ({...prev, [id]: amount}));
    };

    const handleRemoveVignette = (id: string) => {
        setSelectedVignettes(prev => prev.filter(v => v.id !== id));
        setWeightsToUse(prev => {
            const newWeights = {...prev};
            delete newWeights[id];
            return newWeights;
        });
    };

    const handleSave = async () => {
        setError('');
        if (selectedVignettes.length === 0 || Object.values(weightsToUse).every(w => w === 0)) {
            setError('Debe seleccionar y asignar un peso a al menos una viñeta de entrada.');
            return;
        }
        if (!tipoMezcla.trim()) {
            setError('Debe especificar el tipo de mezcla.');
            return;
        }
        setIsSaving(true);
        try {
            const finalInputVignettesData: MezclaVignetteInput[] = selectedVignettes
                .filter(v => (weightsToUse[v.id] || 0) > 0)
                .map(v => ({
                    vignetteId: v.id,
                    vignetteNumber: v.numeroViñeta,
                    tipo: v.tipo,
                    pesoUtilizado: weightsToUse[v.id],
                }));

            const allAffectedVignetteIds = new Set([
                ...(existingMezcla?.inputVignettesData.map(v => v.vignetteId) || []),
                ...finalInputVignettesData.map(v => v.vignetteId)
            ]);

            const updatePromises: Promise<any>[] = [];
            
            // Fetch fresh data before updating
            const allRendimientos = await api.getCollection<Rendimiento>('rendimientos');
            const allReprocesos = await api.getCollection<Reproceso>('reprocesos');

            for (const vignetteId of allAffectedVignetteIds) {
                let parentDoc: Rendimiento | Reproceso | undefined;
                let collectionName: 'rendimientos' | 'reprocesos' | undefined;
                let vignetteArrayKey: 'vignettes' | 'outputVignettes' | undefined;

                parentDoc = allRendimientos.find(r => r.vignettes.some(v => v.id === vignetteId));
                if (parentDoc) {
                    collectionName = 'rendimientos';
                    vignetteArrayKey = 'vignettes';
                } else {
                    parentDoc = allReprocesos.find(r => r.outputVignettes.some(v => v.id === vignetteId));
                    if (parentDoc) {
                        collectionName = 'reprocesos';
                        vignetteArrayKey = 'outputVignettes';
                    }
                }

                if (!parentDoc || !collectionName || !vignetteArrayKey) continue;
                
                const vignetteInDoc = (parentDoc[vignetteArrayKey] as Viñeta[]).find(v => v.id === vignetteId);
                if (!vignetteInDoc) continue;

                const oldUsage = existingMezcla?.inputVignettesData.find(v => v.vignetteId === vignetteId)?.pesoUtilizado || 0;
                const newUsage = finalInputVignettesData.find(v => v.vignetteId === vignetteId)?.pesoUtilizado || 0;
                
                if (oldUsage === newUsage) continue;

                const currentPesoNeto = Number(vignetteInDoc.pesoNeto) || 0;
                const oldUsageNum = Number(oldUsage) || 0;
                const newUsageNum = Number(newUsage) || 0;
                const finalPesoNeto = currentPesoNeto + oldUsageNum - newUsageNum;

                let finalStatus: Viñeta['status'];
                if (finalPesoNeto <= 0.005) {
                    finalStatus = 'Mezclada';
                } else if (Math.abs(finalPesoNeto - (vignetteInDoc.originalPesoNeto || 0)) < 0.005) {
                    finalStatus = 'En Bodega';
                } else {
                    finalStatus = 'Mezclada Parcialmente';
                }
                
                const updatedVignettes = (parentDoc[vignetteArrayKey] as Viñeta[]).map(v => 
                    v.id === vignetteId ? { ...v, pesoNeto: finalPesoNeto, status: finalStatus } : v
                );

                updatePromises.push(api.updateDocument(collectionName, parentDoc.id, { [vignetteArrayKey]: updatedVignettes }));
            }
            await Promise.all(updatePromises);
            
            const totalInputWeight = finalInputVignettesData.reduce((sum, v) => sum + v.pesoUtilizado, 0);
            const despachado = existingMezcla?.cantidadDespachada || 0;
            const sobrante = totalInputWeight - despachado;
            const newStatus: Mezcla['status'] = sobrante <= 0.005 ? 'Agotado' : (despachado > 0.005 ? 'Despachado Parcialmente' : 'Activo');

            const finalMezclaData = {
                inputVignetteIds: finalInputVignettesData.map(v => v.vignetteId),
                inputVignettesData: finalInputVignettesData,
                totalInputWeight,
                tipoMezcla,
                cantidadDespachada: despachado,
                sobranteEnBodega: sobrante,
                status: newStatus,
                notes: notes,
            };

            if (isEditMode && existingMezcla) {
                await api.updateDocument<Mezcla>('mezclas', existingMezcla.id, finalMezclaData);
            } else {
                const allMezclas = await api.getCollection<Mezcla>('mezclas');
                const maxNum = allMezclas.reduce((max, m) => {
                    if (!m.mezclaNumber?.startsWith('Mezcla-')) return max;
                    const num = parseInt(m.mezclaNumber.split('-')[1]);
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0);
                const mezclaNumber = `Mezcla-${maxNum + 1}`;
    
                const data: Omit<Mezcla, 'id'> = {
                    mezclaNumber,
                    creationDate: new Date().toISOString().split('T')[0],
                    ...finalMezclaData,
                };
    
                const savedMezcla = await api.addDocument<Mezcla>('mezclas', data);
                printComponent(<MezclaPDF mezcla={savedMezcla} />, `Mezcla-${savedMezcla.mezclaNumber}`);
            }

            onSaveSuccess();

        } catch (error) {
            console.error("Error saving mezcla:", error);
            setError('Hubo un error al guardar la mezcla.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const canSave = selectedVignettes.length > 0 && tipoMezcla.trim() && !isSaving;

    return (
        <div className="space-y-6">
            <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver</button>
            <h2 className="text-2xl font-bold text-foreground">{isEditMode ? `Editar Mezcla ${existingMezcla!.mezclaNumber}` : 'Crear Nueva Mezcla'}</h2>
            
            {/* Section 1: Information */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">1. Información de la Mezcla</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="tipoMezcla" className="block text-sm font-medium text-muted-foreground mb-1">Tipo de Mezcla *</label>
                        <input id="tipoMezcla" value={tipoMezcla} onChange={e => setTipoMezcla(e.target.value)} required className="w-full p-2 border rounded-md bg-background border-input" placeholder="Ej: Café de Tercera, SHB Exportación" />
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">Notas</label>
                        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full p-2 border rounded-md bg-background border-input" placeholder="Comentarios sobre la mezcla..."></textarea>
                    </div>
                </div>
            </div>
            
            {/* Section 2: Input Vignettes */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">2. Viñetas de Entrada</h3>
                <button type="button" onClick={() => setShowVignetteSelector(true)} className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    {isEditMode ? 'Editar Viñetas' : 'Seleccionar Viñetas del Inventario'}
                </button>

                {selectedVignettes.length > 0 && (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground whitespace-nowrap"><tr><th className="pb-2 w-1/4">No. Viñeta</th><th className="pb-2 w-1/4">Tipo</th><th className="pb-2 w-1/4 text-right">Peso Neto Disponible</th><th className="pb-2 w-1/4">Peso a Utilizar</th><th></th></tr></thead>
                            <tbody>
                                {selectedVignettes.map(v => (
                                    <tr key={v.id} className="border-b">
                                        <td className="p-2 font-semibold text-red-500">{v.numeroViñeta}</td>
                                        <td className="p-2">{v.tipo}</td>
                                        <td className="p-2 text-right">{v.pesoNeto.toFixed(2)}</td>
                                        <td className="p-2"><input type="number" value={weightsToUse[v.id] || ''} onChange={e => handleWeightChange(v.id, e.target.value)} max={v.pesoNeto} className="w-full p-2 border rounded-md bg-background border-input text-right" /></td>
                                        <td><button onClick={() => handleRemoveVignette(v.id)}><TrashIcon className="w-4 h-4 text-red-500"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="font-bold bg-muted/50">
                                <tr>
                                    <td colSpan={3} className="p-2 text-right">Total a Mezclar:</td>
                                    <td className="p-2 text-right">{totals.totalInputWeight.toFixed(2)} qqs.</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Section 3: Summary */}
            <div className="bg-card border-2 border-green-500/50 rounded-lg shadow-sm p-6">
                 <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">3. Resumen y Finalización</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="text-center bg-muted/50 p-6 rounded-lg">
                        <p className="text-sm text-muted-foreground">PESO TOTAL DE LA MEZCLA</p>
                        <p className="text-5xl font-bold text-green-600 my-2">{totals.totalInputWeight.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">quintales</p>
                    </div>
                     <div className="space-y-2">
                         <h4 className="font-semibold text-center text-foreground">Composición de la Mezcla</h4>
                        {compositionSummary.length > 0 ? (
                            <div className="border rounded-lg p-2">
                                {compositionSummary.map(item => (
                                    <div key={item.tipo} className="flex justify-between items-center text-sm p-2 border-b last:border-b-0">
                                        <span className="font-medium text-muted-foreground">{item.tipo}</span>
                                        <div className="text-right">
                                            <span className="font-bold text-foreground">{item.peso.toFixed(2)} qqs.</span>
                                            <span className="text-xs text-muted-foreground ml-2">({item.porcentaje.toFixed(1)}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-4">Agrega viñetas para ver la composición.</p>
                        )}
                    </div>
                 </div>
            </div>
            
            {error && <p className="text-sm text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
             <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={!canSave} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md">
                     {isSaving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Guardar y Imprimir')}
                </button>
            </div>
            
            {showVignetteSelector && (
                <SelectVignettesModal 
                    onClose={() => setShowVignetteSelector(false)} 
                    onSelect={handleSelectVignettes}
                    initialSelectedIds={selectedVignettes.map(v => v.id)}
                />
            )}
        </div>
    );
};

export default MezclaForm;