import React from 'react';
import { ThreshingOrder, ThreshingOrderReceipt, Contract, ContractLot } from '../types';

interface ThreshingOrderPDFProps {
    order: ThreshingOrder;
    receipts: ThreshingOrderReceipt[];
    contract: Contract;
    lots: ContractLot[];
}

const ThreshingOrderPDF: React.FC<ThreshingOrderPDFProps> = ({ order, receipts, contract, lots }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const getLotPartida = (lotId: string) => lots.find(l => l.id === lotId)?.partida || 'Desconocida';
    const partidasAsociadas = order.lotIds.map(getLotPartida).join(', ');

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #059669', paddingBottom: '15px' }}>
                <div>
                    <h1 style={{ color: '#059669', margin: 0, fontSize: '28px' }}>Orden de Trilla</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '16px' }}><strong>No. Orden:</strong> {order.orderNumber}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(order.creationDate)}</p>
                    <p style={{ margin: '5px 0 0 0' }}><strong>Contrato:</strong> {contract.contractNumber}</p>
                </div>
            </header>

            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Información de la Orden</h2>
                <p><strong>Partidas del Contrato a Completar:</strong> {partidasAsociadas}</p>
                <p><strong>Comprador:</strong> {contract.buyerName}</p>
            </section>
            
            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                 <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Detalle de Recibos a Trillar</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                        <tr>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Recibo No.</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Proveedor</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Cantidad a Trillar</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Primeras (Estimado)</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Catadura (Estimado)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.map(r => (
                            <tr key={r.id}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.receiptNumber}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.supplierName}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{r.amountToThresh.toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{r.primeras.toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{r.catadura.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                        <tr>
                            <td colSpan={2} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Totales:</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{order.totalToThresh.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{order.totalPrimeras.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{order.totalCatadura.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            <footer style={{ marginTop: '80px', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '14px', borderTop: '1px solid #ccc' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ borderTop: '1px solid #333', paddingTop: '10px', width: '250px' }}>Preparado Por</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ borderTop: '1px solid #333', paddingTop: '10px', width: '250px' }}>Recibido Por (Bodega)</p>
                </div>
            </footer>
        </div>
    );
};

export default ThreshingOrderPDF;
