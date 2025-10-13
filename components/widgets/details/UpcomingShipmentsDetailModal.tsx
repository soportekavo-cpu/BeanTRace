import React from 'react';
import { Contract } from '../../../types';

interface UpcomingShipmentsDetailModalProps {
    contracts: Contract[];
    onClose: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};


const UpcomingShipmentsDetailModal: React.FC<UpcomingShipmentsDetailModalProps> = ({ contracts, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-foreground mb-4">Contratos con Embarque Próximo</h3>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-2 text-left font-semibold">Contrato</th>
                                <th className="p-2 text-left font-semibold">Comprador</th>
                                <th className="p-2 text-left font-semibold">Mes de Embarque</th>
                                <th className="p-2 text-left font-semibold">Fecha de Venta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map(contract => (
                                <tr key={contract.id} className="border-t">
                                    <td className="p-2 font-medium text-green-600">{contract.contractNumber}</td>
                                    <td className="p-2">{contract.buyerName}</td>
                                    <td className="p-2">{contract.shipmentMonth}</td>
                                    <td className="p-2">{formatDate(contract.saleDate)}</td>
                                </tr>
                            ))}
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

export default UpcomingShipmentsDetailModal;
