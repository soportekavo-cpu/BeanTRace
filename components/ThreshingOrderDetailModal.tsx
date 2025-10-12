import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { ThreshingOrder, ThreshingOrderReceipt, ContractLot, Contract } from '../types';
import PrinterIcon from './icons/PrinterIcon';

interface ThreshingOrderDetailModalProps {
    order: ThreshingOrder;
    lots: ContractLot[];
    contract: Contract;
    onPrint: (order: ThreshingOrder) => void;
    onClose: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const ThreshingOrderDetailModal: React.FC<ThreshingOrderDetailModalProps> = ({ order, lots, contract, onPrint, onClose }) => {
    const [receipts, setReceipts] = useState<ThreshingOrderReceipt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReceipts = async () => {
            setLoading(true);
            try {
                const receiptsData = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', r => r.threshingOrderId === order.id);
                setReceipts(receiptsData);
            } catch (error) {
                console.error("Error fetching order receipts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReceipts();
    }, [order.id]);

    const calculations = useMemo(() => {
        const neededPrimeras = order.lotIds.reduce((sum, lotId) => {
            const lot = lots.find(l => l.id === lotId);
            return sum + (lot?.pesoQqs ?? 0);
        }, 0);
        const difference = neededPrimeras - order.totalPrimeras;
        return { neededPrimeras, difference };
    }, [order.lotIds, order.totalPrimeras, lots]);

    const getLotPartida = (lotId: string) => lots.find(l => l.id === lotId)?.partida || 'Desconocida';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-xl font-bold text-foreground">Detalle de Orden de Trilla: <span className="text-blue-600">{order.orderNumber}</span></h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2">
                    {/* General Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div><p className="text-muted-foreground">Fecha de Creación</p><p className="font-medium text-foreground">{formatDate(order.creationDate)}</p></div>
                        <div><p className="text-muted-foreground">Partidas Asociadas</p><p className="font-medium text-foreground">{order.lotIds.map(getLotPartida).join(', ')}</p></div>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-card border-2 border-green-500/50 rounded-lg shadow-sm my-6 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="font-semibold">
                            <p className="text-muted-foreground text-sm">Necesario (Primeras)</p>
                            <p className="text-2xl text-foreground">{calculations.neededPrimeras.toFixed(2)}</p>
                        </div>
                        <div className="font-semibold">
                            <p className="text-muted-foreground text-sm">Producido (Primeras)</p>
                            <p className="text-2xl text-foreground">{order.totalPrimeras.toFixed(2)}</p>
                        </div>
                        <div className="font-semibold">
                            <p className="text-muted-foreground text-sm">Diferencia</p>
                            <p className={`text-3xl ${calculations.difference > 0.005 ? 'text-red-500' : 'text-green-600'}`}>{calculations.difference.toFixed(2)}</p>
                        </div>
                        <div className="pt-4 border-t col-span-full grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-muted-foreground text-sm">Total A Trillar</p>
                                <p className="text-xl font-bold">{order.totalToThresh.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm">Total Primeras</p>
                                <p className="text-xl font-bold">{order.totalPrimeras.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm">Total Catadura</p>
                                <p className="text-xl font-bold">{order.totalCatadura.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>


                    {/* Receipts Table */}
                    <h4 className="text-lg font-semibold text-foreground mt-6 mb-3">Recibos Utilizados</h4>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted-foreground">
                            <thead className="text-xs uppercase bg-muted">
                                <tr>
                                    <th className="px-4 py-2">Recibo</th>
                                    <th className="px-4 py-2">Proveedor</th>
                                    <th className="px-4 py-2">Tipo Café</th>
                                    <th className="px-4 py-2 text-right">A Trillar</th>
                                    <th className="px-4 py-2 text-right">Primeras</th>
                                    <th className="px-4 py-2 text-right">Catadura</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-6">Cargando recibos...</td></tr>
                                ) : receipts.map(r => (
                                    <tr key={r.id} className="border-b border-border">
                                        <td className="px-4 py-3 font-semibold text-green-600">{r.receiptNumber}</td>
                                        <td className="px-4 py-3">{r.supplierName}</td>
                                        <td className="px-4 py-3">{r.coffeeType}</td>
                                        <td className="px-4 py-3 text-right">{r.amountToThresh.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">{r.primeras.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right">{r.catadura.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="font-bold text-foreground bg-muted/50">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-right">Totales:</td>
                                    <td className="px-4 py-3 text-right">{order.totalToThresh.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">{order.totalPrimeras.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">{order.totalCatadura.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="flex-shrink-0 flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button type="button" onClick={() => onPrint(order)} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted flex items-center gap-2">
                        <PrinterIcon className="w-4 h-4"/> Imprimir
                    </button>
                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default ThreshingOrderDetailModal;