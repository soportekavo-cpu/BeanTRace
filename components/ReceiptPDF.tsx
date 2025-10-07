import React from 'react';
import { PurchaseReceipt, Supplier } from '../types';

interface ReceiptPDFProps {
    receipt: PurchaseReceipt;
    supplier: Supplier;
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipt, supplier }) => {
    
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <tr>
            <td style={{ padding: '6px', fontWeight: 'bold', width: '30%' }}>{label}:</td>
            <td style={{ padding: '6px', borderBottom: '1px solid #ccc' }}>{value}</td>
        </tr>
    );

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', height: '297mm', boxSizing: 'border-box' }}>
            <h1 style={{ textAlign: 'center', color: '#166534', borderBottom: '2px solid #166534', paddingBottom: '10px' }}>
                Recibo de Compra de Café
            </h1>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '30px', fontSize: '14px' }}>
                <tbody>
                    <DetailRow label="Recibo N.°" value={<span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{receipt.recibo}</span>} />
                    <DetailRow label="Fecha" value={formatDate(receipt.fecha)} />
                    <DetailRow label="Proveedor" value={supplier.name} />
                    <DetailRow label="Certificación" value={receipt.certificacion.join(', ') || 'N/A'} />
                    <DetailRow label="Placa del Vehículo" value={receipt.placaVehiculo} />
                    <DetailRow label="Piloto" value={receipt.piloto} />
                    <DetailRow label="Tipo de Café" value={receipt.tipo === 'Otro' ? receipt.customTipo : receipt.tipo} />
                    <tr><td colSpan={2} style={{height: '20px'}}></td></tr>
                    <DetailRow label="Peso Bruto" value={`${receipt.pesoBruto.toFixed(2)}`} />
                    <DetailRow label="Sacos de Yute" value={receipt.yute} />
                    <DetailRow label="Bolsas de Nylon" value={receipt.nylon} />
                    <DetailRow label="Tara" value={`${receipt.tara.toFixed(2)}`} />
                    <DetailRow label="Peso Neto" value={<span style={{ fontWeight: 'bold' }}>{receipt.pesoNeto.toFixed(2)}</span>} />
                     <tr><td colSpan={2} style={{height: '20px'}}></td></tr>
                    <DetailRow label="Notas" value={<div style={{ minHeight: '60px', whiteSpace: 'pre-wrap' }}>{receipt.notas}</div>} />
                </tbody>
            </table>
            
            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-around', fontSize: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '2px solid #333', paddingTop: '10px', width: '250px' }}>
                        Firma de Entregado
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '2px solid #333', paddingTop: '10px', width: '250px' }}>
                        Firma de Recibido
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptPDF;