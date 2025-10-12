import React from 'react';
import { PurchaseReceipt, Supplier } from '../../../types';
import { formatNumber } from '../../../utils/formatting';

interface RawMaterialDetailModalProps {
    coffeeType: string;
    receipts: PurchaseReceipt[];
    suppliers: Supplier[];
    onClose: () => void;
}

const RawMaterialDetailModal: React.FC<RawMaterialDetailModalProps> = ({ coffeeType, receipts, suppliers, onClose }) => {
    
    const relevantReceipts = receipts.filter(r => {
        const type = r.tipo === 'Otro' ? r.customTipo : r.tipo;
        return type === coffeeType && r.enBodega > 0.005 && r.status === 'Activo';
    });

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'N/A';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-foreground mb-4">Inventario de: <span className="text-green-600">{coffeeType}</span></h3>
                <div className="flex-grow overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-2 text-left font-semibold">Recibo</th>
                                <th className="p-2 text-left font-semibold">Proveedor</th>
                                <th className="p-2 text-right font-semibold">En Bodega (qqs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relevantReceipts.map(receipt => (
                                <tr key={receipt.id} className="border-t">
                                    <td className="p-2 font-medium">{receipt.recibo}</td>
                                    <td className="p-2">{getSupplierName(receipt.proveedorId)}</td>
                                    <td className="p-2 text-right font-bold">{formatNumber(receipt.enBodega)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold bg-muted">
                             <tr>
                                <td colSpan={2} className="p-2 text-right">Total:</td>
                                <td className="p-2 text-right">{formatNumber(relevantReceipts.reduce((sum, r) => sum + r.enBodega, 0))}</td>
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

export default RawMaterialDetailModal;