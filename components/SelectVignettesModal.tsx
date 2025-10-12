import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Rendimiento, Viñeta, Reproceso } from '../types';

interface SelectVignettesModalProps {
    onClose: () => void;
    onSelect: (vignettes: Viñeta[]) => void;
    existingReproceso?: Reproceso | null;
    initialSelectedIds?: string[];
}

const SelectVignettesModal: React.FC<SelectVignettesModalProps> = ({ onClose, onSelect, existingReproceso, initialSelectedIds }) => {
    const [allVignettes, setAllVignettes] = useState<Viñeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds || []));

    useEffect(() => {
        const fetchVignettes = async () => {
            setLoading(true);
            try {
                const [rendimientos, reprocesos] = await Promise.all([
                    api.getCollection<Rendimiento>('rendimientos'),
                    api.getCollection<Reproceso>('reprocesos')
                ]);
                
                const vignettesFromRendimientos = rendimientos.flatMap(r => r.vignettes);
                const vignettesFromReprocesos = reprocesos.flatMap(r => r.outputVignettes);
                
                const allCombinedVignettes = [...vignettesFromRendimientos, ...vignettesFromReprocesos];

                let availableVignettes = allCombinedVignettes.filter(v => {
                    // Condition 1: It has stock in the warehouse (either untouched or partially used).
                    const hasStock = (v.status === 'En Bodega' || v.status === 'Mezclada Parcialmente') && v.pesoNeto > 0.005;

                    // Condition 2 (for edit mode): It's one of the original inputs for THIS reprocess.
                    const isOriginalInput = existingReproceso
                        ? existingReproceso.inputVignetteIds.includes(v.id)
                        : false;

                    return hasStock || isOriginalInput;
                });

                // Condition 3 (for edit mode): Exclude the outputs of THIS reprocess to prevent loops.
                if (existingReproceso) {
                    const outputIds = new Set(existingReproceso.outputVignettes.map(v => v.id));
                    availableVignettes = availableVignettes.filter(v => !outputIds.has(v.id));
                }
    
                setAllVignettes(availableVignettes);
            } catch (error) {
                console.error("Error fetching vignettes for modal:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVignettes();
    }, [existingReproceso]);

    const filteredVignettes = useMemo(() => {
        if (!searchTerm) return allVignettes;
        return allVignettes.filter(v => 
            v.numeroViñeta.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.tipo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allVignettes, searchTerm]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const handleConfirm = () => {
        const selectedVignettes = allVignettes.filter(v => selectedIds.has(v.id));
        onSelect(selectedVignettes);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-foreground mb-4">Seleccionar Viñetas de Inventario</h3>
                <input 
                    type="text"
                    placeholder="Buscar por No. Viñeta o Tipo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background border-input mb-4"
                />
                <div className="flex-grow overflow-y-auto border-t border-b">
                    {loading ? <p>Cargando...</p> : (
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-muted-foreground"><th className="p-2"></th><th className="p-2">No. Viñeta</th><th className="p-2">Tipo</th><th className="p-2 text-right">Peso Neto</th></tr></thead>
                            <tbody>
                                {filteredVignettes.map(v => (
                                    <tr key={v.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => handleToggle(v.id)}>
                                        <td className="p-2"><input type="checkbox" checked={selectedIds.has(v.id)} readOnly /></td>
                                        <td className="p-2 font-semibold text-red-500">{v.numeroViñeta}</td>
                                        <td className="p-2">{v.tipo}</td>
                                        <td className="p-2 text-right">{v.pesoNeto.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                 <div className="flex justify-between items-center mt-4">
                    <p className="text-sm font-medium">{selectedIds.size} viñeta(s) seleccionada(s)</p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                        <button onClick={handleConfirm} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Confirmar Selección</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectVignettesModal;