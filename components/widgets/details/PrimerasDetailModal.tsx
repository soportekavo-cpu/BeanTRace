import React from 'react';
import { Viñeta } from '../../../types';
import { formatNumber } from '../../../utils/formatting';

interface PrimerasDetailModalProps {
    primerasType: 'Primeras Lavado' | 'Primeras Natural';
    vignettes: Viñeta[];
    onClose: () => void;
}

const PrimerasDetailModal: React.FC<PrimerasDetailModalProps> = ({ primerasType, vignettes, onClose }) => {
    
    const relevantVignettes = vignettes.filter(v => {
        const tipoLower = v.tipo.toLowerCase();
        const isInStock = (v.status === 'En Bodega' || v.status === 'Mezclada Parcialmente') && v.pesoNeto > 0.005;
        if (!isInStock) return false;
    
        if (primerasType === 'Primeras Lavado') {
            return tipoLower === 'primeras de lavado' || tipoLower === 'l. primeras';
        }
        if (primerasType === 'Primeras Natural') {
            return tipoLower === 'primeras de natural' || tipoLower === 'n. primeras';
        }
        return false;
    });


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-foreground mb-4">Inventario de: <span className="text-yellow-500">{primerasType}</span></h3>
                <div className="flex-grow overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-2 text-left font-semibold">No. Viñeta</th>
                                <th className="p-2 text-left font-semibold">Tipo Exacto</th>
                                <th className="p-2 text-right font-semibold">Peso Actual (qqs.)</th>
                                <th className="p-2 text-center font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relevantVignettes.map(vignette => (
                                <tr key={vignette.id} className="border-t">
                                    <td className="p-2 font-medium text-red-600">{vignette.numeroViñeta}</td>
                                    <td className="p-2">{vignette.tipo}</td>
                                    <td className="p-2 text-right font-bold">{formatNumber(vignette.pesoNeto)}</td>
                                    <td className="p-2 text-center">{vignette.status}</td>
                                </tr>
                            ))}
                        </tbody>
                         <tfoot className="font-bold bg-muted">
                             <tr>
                                <td colSpan={2} className="p-2 text-right">Total:</td>
                                <td className="p-2 text-right">{formatNumber(relevantVignettes.reduce((sum, v) => sum + v.pesoNeto, 0))}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default PrimerasDetailModal;
