import React from 'react';
import { Mezcla } from '../../../types';
import { formatNumber } from '../../../utils/formatting';

interface MixtureDetailModalProps {
    mixtureType: string;
    mezclas: Mezcla[];
    onClose: () => void;
}

const MixtureDetailModal: React.FC<MixtureDetailModalProps> = ({ mixtureType, mezclas, onClose }) => {
    
    const relevantMezclas = mezclas.filter(m => 
        m.tipoMezcla === mixtureType && m.sobranteEnBodega > 0.005
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-foreground mb-4">Inventario de Mezcla: <span className="text-purple-600">{mixtureType}</span></h3>
                <div className="flex-grow overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-2 text-left font-semibold">No. Mezcla</th>
                                <th className="p-2 text-right font-semibold">En Bodega (qqs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relevantMezclas.map(mezcla => (
                                <tr key={mezcla.id} className="border-t">
                                    <td className="p-2 font-medium">{mezcla.mezclaNumber}</td>
                                    <td className="p-2 text-right font-bold">{formatNumber(mezcla.sobranteEnBodega)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold bg-muted">
                             <tr>
                                <td className="p-2 text-right">Total:</td>
                                <td className="p-2 text-right">{formatNumber(relevantMezclas.reduce((sum, m) => sum + m.sobranteEnBodega, 0))}</td>
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

export default MixtureDetailModal;