import React from 'react';
import { ContractLot, Contract } from '../../../types';
import { formatNumber } from '../../../utils/formatting';

interface FixationsDetailModalProps {
    lots: ContractLot[];
    contracts: Contract[];
    onClose: () => void;
}

const FixationsDetailModal: React.FC<FixationsDetailModalProps> = ({ lots, contracts, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-foreground mb-4">Partidas Pendientes de Fijación</h3>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-2 text-left font-semibold">Partida</th>
                                <th className="p-2 text-left font-semibold">Tipo de Café</th>
                                <th className="p-2 text-left font-semibold">Posición (Mes Mercado)</th>
                                <th className="p-2 text-right font-semibold">Peso (qqs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lots.map(lot => {
                                const contract = contracts.find(c => c.id === lot.contractId);
                                return (
                                    <tr key={lot.id} className="border-t">
                                        <td className="p-2 font-medium text-green-600">{lot.partida}</td>
                                        <td className="p-2">{contract?.coffeeType || 'N/A'}</td>
                                        <td className="p-2">{contract?.position || 'N/A'}</td>
                                        <td className="p-2 text-right font-bold">{formatNumber(lot.pesoQqs)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default FixationsDetailModal;
