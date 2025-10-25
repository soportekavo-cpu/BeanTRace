

import React from 'react';
import { PurchaseReceipt, Supplier } from '../types';
import DizanoLogo from './icons/DizanoLogo';

interface ReceiptPDFProps {
    receipt: PurchaseReceipt;
    supplier: Supplier;
    exporterLogo?: string;
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipt, supplier, exporterLogo }) => {
    
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const day = date.getDate();
        const year = date.getFullYear();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthName = monthNames[date.getMonth()];
        return `${day} de ${monthName} de ${year}`;
    };

    const formatNumber = (value: number | undefined) => {
        return value !== undefined ? value.toFixed(2) : '0.00';
    }

    const mainContainerStyle: React.CSSProperties = {
        fontFamily: 'Helvetica, Arial, sans-serif',
        color: '#1E293B', // A dark slate color instead of pure black
        padding: '30px',
        backgroundColor: '#fff',
        width: '210mm',
        height: '148mm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '10px',
        lineHeight: '1.5',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    };

    const sectionTitleStyle: React.CSSProperties = {
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#64748B', // A lighter slate for labels
        textTransform: 'uppercase',
        marginBottom: '4px',
        letterSpacing: '0.5px'
    };

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '10px'
    };

    const thStyle: React.CSSProperties = {
        borderBottom: '2px solid #1E293B',
        padding: '8px',
        textAlign: 'left',
        fontSize: '9px',
        textTransform: 'uppercase',
        fontWeight: 'bold',
    };

    const tdStyle: React.CSSProperties = {
        borderBottom: '1px solid #E2E8F0',
        padding: '8px',
    };

    const certificaciones = receipt.certificacion && receipt.certificacion.length > 0
        ? receipt.certificacion.join(', ')
        : '-';

    return (
        <div style={mainContainerStyle}>
            {/* Header */}
            <header style={headerStyle}>
                <div>
                    {exporterLogo && (
                        <img src={exporterLogo} style={{ maxHeight: '80px', width: 'auto' }} alt="Logo" />
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>RECIBO DE CAFÉ</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '18px', color: '#DC2626' }}>Nº {receipt.recibo}</p>
                </div>
            </header>
            
            <div style={{height: '20px'}}></div>

            {/* Info Section */}
            <section style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '10px 0' }}>
                <div style={{ width: '25%' }}>
                    <h4 style={sectionTitleStyle}>Proveedor</h4>
                    <p style={{ margin: 0 }}>{supplier.name}</p>
                </div>
                <div style={{ width: '25%' }}>
                    <h4 style={sectionTitleStyle}>Transporte</h4>
                    <p style={{ margin: 0 }}><strong>Piloto:</strong> {receipt.piloto || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Placa:</strong> {receipt.placaVehiculo || 'N/A'}</p>
                </div>
                <div style={{ width: '25%' }}>
                    <h4 style={sectionTitleStyle}>Certificación</h4>
                    <p style={{ margin: 0 }}>{certificaciones}</p>
                </div>
                <div style={{ width: '25%', textAlign: 'right' }}>
                    <h4 style={sectionTitleStyle}>Fecha</h4>
                    <p style={{ margin: 0 }}>{formatDate(receipt.fecha)}</p>
                </div>
            </section>
            
            {/* Main Table */}
            <section style={{ marginTop: '20px', flexGrow: 1 }}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={{...thStyle, width: '30%'}}>Tipo de Café</th>
                            <th style={{...thStyle, textAlign: 'center'}}>Sacos Yute</th>
                            <th style={{...thStyle, textAlign: 'center'}}>Sacos Nylon</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Peso Bruto</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Tara</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Peso Neto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{...tdStyle, fontWeight: 'bold' }}>{receipt.tipo === 'Otro' ? receipt.customTipo : receipt.tipo}</td>
                            <td style={{...tdStyle, textAlign: 'center'}}>{receipt.yute}</td>
                            <td style={{...tdStyle, textAlign: 'center'}}>{receipt.nylon}</td>
                            <td style={{...tdStyle, textAlign: 'right'}}>{formatNumber(receipt.pesoBruto)}</td>
                            <td style={{...tdStyle, textAlign: 'right'}}>{formatNumber(receipt.tara)}</td>
                            <td style={{...tdStyle, textAlign: 'right', fontWeight: 'bold'}}>{formatNumber(receipt.pesoNeto)}</td>
                        </tr>
                    </tbody>
                    <tfoot style={{ fontWeight: 'bold', borderTop: '2px solid #1E293B' }}>
                        <tr>
                            <td style={{ ...tdStyle, borderBottom: 'none' }}>TOTALES:</td>
                            <td style={{ ...tdStyle, textAlign: 'center', borderBottom: 'none' }}>{receipt.yute}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', borderBottom: 'none' }}>{receipt.nylon}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>{formatNumber(receipt.pesoBruto)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>{formatNumber(receipt.tara)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>{formatNumber(receipt.pesoNeto)}</td>
                        </tr>
                    </tfoot>
                </table>

                {receipt.notas && (
                     <div style={{ marginTop: '15px' }}>
                        <h4 style={sectionTitleStyle}>Observaciones</h4>
                        <p style={{ margin: 0, fontSize: '10px' }}>{receipt.notas}</p>
                    </div>
                )}
            </section>
            
            {/* Signatures */}
            <footer style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #1E293B', paddingTop: '8px', width: '250px' }}>
                        Entregado por
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #1E293B', paddingTop: '8px', width: '250px' }}>
                        Recibí Conforme
                    </div>
                </div>
            </footer>

            {/* Dizano Address Footer */}
            <div style={{ borderTop: '1px solid #F97316', marginTop: '20px', paddingTop: '5px', textAlign: 'center', fontSize: '9px', color: '#64748B' }}>
                <p style={{margin: 0}}>DIZANO, S.A. - 1ra. Av. A 4-33 Granjas La Joya, Zona 8 San Miguel Petapa, Guatemala</p>
                <p style={{margin: 0}}>PBX: (502) 2319-8700 - E-mail: exportaciones@cafelasregiones.gt</p>
            </div>
        </div>
    );
};

export default ReceiptPDF;