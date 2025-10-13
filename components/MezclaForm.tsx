import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Mezcla, Viñeta, Rendimiento, Reproceso, MezclaVignetteInput } from '../types';
import SelectVignettesModal from './SelectVignettesModal';
import { printComponent } from '../utils/printUtils';
import MezclaPDF from './MezclaPDF';
import TrashIcon from './icons/TrashIcon';

interface MezclaFormProps {
    existingMezcla?: Mezcla | null;
    rendimientos: Rendimiento[];
    reprocesos: Reproceso[];
    onCancel: () => void;
    onSaveSuccess: () => void;
}

const MezclaForm: React.FC<MezclaFormProps> = ({ existingMezcla, rendimientos, reprocesos, onCancel, onSaveSuccess }) => {
    const isEditMode = !!existingMezcla;
    const [isSaving, setIsSaving] = useState(false);
    const [showVignetteSelector, setShowVignetteSelector] = useState(false);
    const [error, setError] = useState('');
    
    const [allVignettes, setAllVignettes] = useState<Viñeta[]>([]);
    const [selectedVignettes, setSelectedVignettes] = useState<Viñeta[]>([]);
    const [weightsToUse, setWeightsToUse] = useState<Record<string, number>>({});

    const [tipoMezcla, setTipoMezcla] = useState(existingMezcla?.tipoMezcla || '');

     useEffect(() => {
        const vignettesFromRendimientos = rendimientos.flatMap(r => r.vignettes);
        const vignettesFromReprocesos = reprocesos.flatMap(r => r.outputVignettes);
        const combined = [...vignettesFromRendimientos, ...vignettesFromReprocesos];
        setAllVignettes(combined);

        if (isEditMode && existingMezcla) {
            const initialVignettes = existingMezcla.inputVignettesData.map(iv => {
                const originalVignette = combined.find(v => v.id === iv.vignetteId);
                // FIX: Explicitly cast values to Number before performing arithmetic operations
                const pesoNetoForEditing = (originalVignette ? (Number(originalVignette.pesoNeto) || 0) : 0) + (Number(iv.pesoUtilizado) || 0);

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
    }, [isEditMode, existingMezcla, rendimientos, reprocesos]);

    const totals = useMemo(() => {
        const totalInputWeight = Object.values(weightsToUse).reduce((sum, weight) => sum + (Number(weight) || 0), 0);
        const despachado = existingMezcla?.cantidadDespachada || 0;
        const sobrante = totalInputWeight - despachado;
        return { totalInputWeight, sobrante };
    }, [weightsToUse, existingMezcla]);

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
        if (selectedVignettes.length === 0) {
            setError('Debe seleccionar al menos una viñeta de entrada.');
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

            for (const vignetteId of allAffectedVignetteIds) {
                let doc: Rendimiento | Reproceso | undefined;
                let docType: 'Rendimiento' | 'Reproceso' | undefined;
                let vignetteArrayKey: 'vignettes' | 'outputVignettes' | undefined;
                let sourceArray: (Rendimiento | Reproceso)[] | undefined;

                doc = rendimientos.find(r => r.vignettes.some(v => v.id === vignetteId));
                if (doc) {
                    docType = 'Rendimiento';
                    vignetteArrayKey = 'vignettes';
                    sourceArray = rendimientos;
                } else {
                    doc = reprocesos.find(r => r.outputVignettes.some(v => v.id === vignetteId));
                    if (doc) {
                        docType = 'Reproceso';
                        vignetteArrayKey = 'outputVignettes';
                        sourceArray = reprocesos;
                    }
                }

                if (!doc || !docType || !vignetteArrayKey || !sourceArray) continue;

                const originalDoc = sourceArray.find(d => d.id === doc!.id)!;
                const originalVignetteInDoc = originalDoc[vignetteArrayKey].find(v => v.id === vignetteId)!;
                
                const oldUsage = existingMezcla?.inputVignettesData.find(v => v.vignetteId === vignetteId)?.pesoUtilizado || 0;
                const newUsage = finalInputVignettesData.find(v => v.vignetteId === vignetteId)?.pesoUtilizado || 0;
                
                if (oldUsage === newUsage) continue;

                const finalPesoNeto = (Number(originalVignetteInDoc.pesoNeto) || 0) + (Number(oldUsage) || 0) - (Number(newUsage) || 0);

                let finalStatus: Viñeta['status'];
                 if (finalPesoNeto <= 0.005) {
                    finalStatus = 'Mezclada';
                } else {
                    finalStatus = 'Mezclada Parcialmente';
                }
                
                const updatedVignettes = originalDoc[vignetteArrayKey].map((v: Viñeta) => 
                    v.id === vignetteId ? { ...v, pesoNeto: finalPesoNeto, status: finalStatus } : v
                );

                updatePromises.push(api.updateDocument(docType === 'Rendimiento' ? 'rendimientos' : 'reprocesos', doc.id, { [vignetteArrayKey]: updatedVignettes }));
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
                status: newStatus
            };

            if (isEditMode && existingMezcla) {
                await api.updateDocument<Mezcla>('mezclas', existingMezcla.id, finalMezclaData);
            } else {
                const allMezclas = await api.getCollection<Mezcla>('mezclas');
                const maxNum = allMezclas.reduce((max, m) => Math.max(max, parseInt(m.mezclaNumber.split('-')[1]) || 0), 0);
                const mezclaNumber = `Mezcla-${maxNum + 1}`;
                const data: Omit<Mezcla, 'id'> = {
                    ...finalMezclaData,
                    mezclaNumber,
                    creationDate: new Date().toISOString().split('T')[0],
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
    
    return (
        <div className="space-y-6">
            <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">&larr; Volver a Mezclas</button>
            <h2 className="text-2xl font-bold text-foreground">{isEditMode ? `Editar Mezcla ${existingMezcla?.mezclaNumber}` : 'Crear Nueva Mezcla'}</h2>

            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-blue-600 mb-4">1. Viñetas de Entrada</h3>
                <button onClick={() => setShowVignetteSelector(true)} className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Seleccionar Viñetas del Inventario
                </button>
                {selectedVignettes.length > 0 && (
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-muted-foreground"><th className="p-2">No. Viñeta</th><th className="p-2">Tipo</th><th className="p-2 text-right">Peso Disponible</th><th className="p-2">Peso a Utilizar</th><th></th></tr></thead>
                        <tbody>
                            {selectedVignettes.map(v => (
                                <tr key={v.id} className="border-b">
                                    <td className="p-2 font-semibold text-red-500">{v.numeroViñeta}</td>
                                    <td className="p-2">{v.tipo}</td>
                                    <td className="p-2 text-right">{v.pesoNeto.toFixed(2)}</td>
                                    <td className="p-2 w-40">
                                        <input
                                            type="number"
                                            value={weightsToUse[v.id] ?? ''}
                                            onChange={e => handleWeightChange(v.id, e.target.value)}
                                            max={v.pesoNeto}
                                            min={0}
                                            step="0.01"
                                            className="w-full p-2 border rounded-md bg-background border-input text-right"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <button onClick={() => handleRemoveVignette(v.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold"><tr><td colSpan={3} className="p-2 text-right">Total a Mezclar:</td><td className="p-2 text-right">{totals.totalInputWeight.toFixed(2)} qqs.</td><td></td></tr></tfoot>
                    </table>
                )}
            </div>
            
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-purple-600 mb-4">2. Información de la Mezcla</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Tipo de Mezcla *</label>
                        <input type="text" value={tipoMezcla} onChange={e => setTipoMezcla(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input" />
                    </div>
                    {isEditMode && (
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Cantidad ya Despachada (qqs.)</label>
                            <p className="p-2 font-bold bg-muted/50 rounded-md min-h-[42px] flex items-center">
                                {(existingMezcla?.cantidadDespachada || 0).toFixed(2)}
                            </p>
                        </div>
                    )}
                     <div className={`font-semibold ${!isEditMode ? 'md:col-start-3' : ''}`}>
                        <p className="text-sm text-muted-foreground">En Bodega</p>
                        <p className="text-2xl text-green-600 mt-1">{totals.sobrante.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="my-4 text-center bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-md" role="alert">
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                     {isSaving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Guardar e Imprimir')}
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