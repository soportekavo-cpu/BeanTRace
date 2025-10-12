import React from 'react';
import { ThreshingOrder, ThreshingOrderReceipt, Contract, ContractLot, Client } from '../types';

interface ThreshingOrderPDFProps {
    order: ThreshingOrder;
    receipts: ThreshingOrderReceipt[];
    contract?: Contract | null;
    lots?: ContractLot[] | null;
    clientName?: string | null;
}

const ThreshingOrderPDF: React.FC<ThreshingOrderPDFProps> = ({ order, receipts, contract, lots, clientName }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const isLocalSale = order.orderType === 'Venta Local';

    const getLotPartida = (lotId: string) => lots?.find(l => l.id === lotId)?.partida || 'Desconocida';
    const partidasAsociadas = !isLocalSale && lots ? order.lotIds.map(getLotPartida).join(', ') : 'N/A';

    const neededPrimerasExport = !isLocalSale && lots ? order.lotIds.reduce((sum, lotId) => {
        const lot = lots.find(l => l.id === lotId);
        return sum + (lot?.pesoQqs ?? 0);
    }, 0) : 0;

    const neededPrimeras = isLocalSale ? (order.pesoVendido || 0) : neededPrimerasExport;
    const difference = order.totalPrimeras - neededPrimeras;

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #059669', paddingBottom: '15px' }}>
                <div>
                    <h1 style={{ color: '#059669', margin: 0, fontSize: '28px' }}>Orden de Trilla</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '16px' }}><strong>No. Orden:</strong> {order.orderNumber}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(order.creationDate)}</p>
                    <p style={{ margin: '5px 0 0 0' }}><strong>Tipo:</strong> {order.orderType}</p>
                </div>
            </header>

            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Información de la Orden</h2>
                {isLocalSale ? (
                    <>
                        <p><strong>Cliente:</strong> {clientName || order.clientName || 'N/A'}</p>
                        <p><strong>Lote:</strong> {order.lote || 'N/A'}</p>
                        <p><strong>Tipo de Preparación:</strong> {order.tipoPreparacion || 'N/A'}</p>
                        <p><strong>Descripción:</strong> {order.description || 'N/A'}</p>
                    </>
                ) : (
                    <>
                        <p><strong>Contrato:</strong> {contract?.contractNumber}</p>
                        <p><strong>Partidas del Contrato a Completar:</strong> {partidasAsociadas}</p>
                        <p><strong>Comprador:</strong> {contract?.buyerName}</p>
                    </>
                )}
            </section>
            
            <section style={{ marginTop: '20px', fontSize: '14px', border: '2px solid #059669', borderRadius: '5px', padding: '15px', display: 'flex', justifyContent: 'space-around', backgroundColor: '#f0fdf4' }}>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Necesario (Primeras)</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '18px'}}>{neededPrimeras.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Producido (Primeras)</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '18px'}}>{order.totalPrimeras.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Diferencia</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '22px', color: difference < -0.005 ? '#ef4444' : '#22c55e'}}>{difference.toFixed(2)}</p>
                </div>
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