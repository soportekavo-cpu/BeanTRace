

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
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #059669', paddingBottom: '15px' }}>
                <div>
                    <h1 style={{ color: '#059669', margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Orden de Trilla</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '16px' }}><strong>No. Orden:</strong> <span style={{ color: '#DC2626' }}>{order.orderNumber}</span></p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(order.creationDate)}</p>
                    <p style={{ margin: '5px 0 0 0' }}><strong>Tipo:</strong> {order.orderType}</p>
                </div>
            </header>

            <section style={{ marginTop: '25px', fontSize: '14px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <h2 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#1e293b' }}>Información de la Orden</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 20px' }}>
                {isLocalSale ? (
                    <>
                        <p><strong>Cliente:</strong> <span style={{ color: '#2563EB' }}>{clientName || order.clientName || 'N/A'}</span></p>
                        <p><strong>Tipo de Café:</strong> <span style={{ color: '#166534' }}>{order.tipoCafe || 'N/A'}</span></p>
                        <p><strong>Lote:</strong> <span style={{ color: '#DC2626' }}>{order.lote || 'N/A'}</span></p>
                        <p><strong>Tipo de Preparación:</strong> {order.tipoPreparacion || 'N/A'}</p>
                        <p style={{gridColumn: 'span 3'}}><strong>Descripción:</strong> {order.description || 'N/A'}</p>
                    </>
                ) : (
                    <>
                        <p><strong>Contrato:</strong> <span style={{ color: '#DC2626' }}>{contract?.contractNumber}</span></p>
                        <p><strong>Comprador:</strong> <span style={{ color: '#2563EB' }}>{contract?.buyerName}</span></p>
                        <p><strong>Tipo de Café:</strong> <span style={{ color: '#166534' }}>{contract?.coffeeType || 'N/A'}</span></p>
                        <p style={{gridColumn: 'span 3'}}><strong>Partidas de la Orden:</strong> <span style={{ color: '#DC2626' }}>{partidasAsociadas}</span></p>
                    </>
                )}
                </div>
            </section>
            
            <section style={{ marginTop: '25px', fontSize: '14px' }}>
                 <h2 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#1e293b' }}>Detalle de Insumos a Trillar</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f1f5f9', fontSize: '12px' }}>
                        <tr>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo Insumo</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>No.</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Origen/Proveedor</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo de Café</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Cantidad a Trillar</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Primeras (Est.)</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Catadura (Est.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.map(r => (
                            <tr key={r.id}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{r.inputType}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', color: '#DC2626' }}>{r.receiptNumber}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', color: '#2563EB' }}>{r.supplierName || 'N/A'}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', color: '#166534' }}>{r.coffeeType}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{r.amountToThresh.toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{r.primeras.toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{r.catadura.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                        <tr>
                            <td colSpan={4} style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Totales:</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{order.totalToThresh.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{order.totalPrimeras.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{order.totalCatadura.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>

            <section style={{ marginTop: '25px', fontSize: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase'}}>Necesario (Primeras)</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '20px', color: '#0f172a'}}>{neededPrimeras.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase'}}>Primeras</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '20px', color: '#0f172a'}}>{order.totalPrimeras.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase'}}>Cataduras</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '20px', color: '#0f172a'}}>{order.totalCatadura.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center', backgroundColor: difference < -0.005 ? '#fee2e2' : '#dcfce7', padding: '10px', borderRadius: '6px' }}>
                    <p style={{margin: '0 0 5px 0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold', color: difference < -0.005 ? '#b91c1c' : '#166534'}}>Diferencia para completar Orden</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '24px', color: difference < -0.005 ? '#ef4444' : '#22c55e'}}>{difference.toFixed(2)}</p>
                </div>
            </section>
        </div>
    );
};

export default ThreshingOrderPDF;
