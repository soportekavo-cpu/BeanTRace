

import React from 'react';
import { Salida } from '../types';

interface SalidaPDFProps {
    salida: Salida;
    exporterLogo?: string;
}

const SalidaPDF: React.FC<SalidaPDFProps> = ({ salida, exporterLogo }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
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
        color: '#1E293B',
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
        color: '#64748B',
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
        verticalAlign: 'top',
    };
    
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
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>GUÍA DE DESPACHO</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '18px' }}>Nº <span style={{ color: '#DC2626' }}>{salida.salidaNumber}</span></p>
                </div>
            </header>
            
            <div style={{height: '20px'}}></div>

            {/* Info Section */}
            <section style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '10px 0' }}>
                <div style={{ width: '33%' }}>
                    <h4 style={sectionTitleStyle}>Destino</h4>
                    <p style={{ margin: 0 }}>{salida.clienteName || 'N/A'}</p>
                </div>
                <div style={{ width: '33%', textAlign: 'center' }}>
                    <h4 style={sectionTitleStyle}>Transporte</h4>
                    <p style={{ margin: 0 }}><strong>Piloto:</strong> {salida.piloto || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Placa:</strong> {salida.placaVehiculo || 'N/A'}</p>
                </div>
                 <div style={{ width: '33%', textAlign: 'right' }}>
                    <h4 style={sectionTitleStyle}>Fecha de Envío</h4>
                    <p style={{ margin: 0 }}>{formatDate(salida.fecha)}</p>
                </div>
            </section>

             {/* Main Table */}
            <section style={{ marginTop: '20px', flexGrow: 1 }}>
                 <h4 style={sectionTitleStyle}>Detalle de Carga</h4>
                <table style={tableStyle}>
                    <thead>
                         <tr>
                            <th style={{...thStyle, width: '25%'}}>Descripción</th>
                            {salida.tipoSalida === 'Devolución Recibo' && <th style={{...thStyle, width: '15%'}}>Proveedor</th>}
                            <th style={{...thStyle, textAlign: 'center'}}>Sacos Yute</th>
                            <th style={{...thStyle, textAlign: 'center'}}>Sacos Nylon</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Peso Bruto</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Tara</th>
                            <th style={{...thStyle, textAlign: 'right'}}>Peso Neto (qqs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salida.tipoSalida === 'Mezcla' && salida.mezclas?.map((m, i) => (
                           <tr key={i}>
                               <td style={tdStyle}>{m.descripcionEnvio || m.mezclaNumber}</td>
                               <td style={{ ...tdStyle, textAlign: 'center' }}>{m.sacosYute}</td>
                               <td style={{ ...tdStyle, textAlign: 'center' }}>{m.sacosNylon}</td>
                               <td style={{ ...tdStyle, textAlign: 'right' }}>{formatNumber(m.pesoBruto)}</td>
                               <td style={{ ...tdStyle, textAlign: 'right' }}>{formatNumber(m.tara)}</td>
                               <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{m.pesoUtilizado.toFixed(2)}</td>
                           </tr>
                       ))}
                       {salida.tipoSalida === 'Devolución Recibo' && salida.recibos?.map((r, i) => (
                           <tr key={i}>
                               <td style={tdStyle}>{r.descripcionDevolucion || `Devolución Recibo ${r.reciboNumber}`}</td>
                               <td style={tdStyle}>{r.proveedorName}</td>
                               <td style={{ ...tdStyle, textAlign: 'center' }}>{r.sacosYute}</td>
                               <td style={{ ...tdStyle, textAlign: 'center' }}>{r.sacosNylon}</td>
                               <td style={{ ...tdStyle, textAlign: 'right' }}>{formatNumber(r.pesoBruto)}</td>
                               <td style={{ ...tdStyle, textAlign: 'right' }}>{formatNumber(r.tara)}</td>
                               <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(r.pesoDevuelto)}</td>
                           </tr>
                       ))}
                    </tbody>
                    <tfoot style={{ fontWeight: 'bold', borderTop: '2px solid #1E293B' }}>
                        <tr>
                            <td colSpan={salida.tipoSalida === 'Mezcla' ? 1 : 2} style={{ ...tdStyle, borderBottom: 'none', textAlign: 'right' }}>TOTALES:</td>
                            <td style={{ ...tdStyle, textAlign: 'center', borderBottom: 'none' }}>{salida.sacosYute}</td>
                            <td style={{ ...tdStyle, textAlign: 'center', borderBottom: 'none' }}>{salida.sacosNylon}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>{formatNumber(salida.pesoBruto)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>{formatNumber(salida.tara)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>{formatNumber(salida.pesoNeto)}</td>
                        </tr>
                    </tfoot>
                </table>
                {salida.notas && (
                     <div style={{ marginTop: '15px' }}>
                        <h4 style={sectionTitleStyle}>Observaciones</h4>
                        <p style={{ margin: 0, fontSize: '10px', whiteSpace: 'pre-wrap' }}>{salida.notas}</p>
                    </div>
                )}
            </section>
            
            {/* Signatures */}
            <footer style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #1E293B', paddingTop: '8px', width: '250px' }}>
                        Despachado por
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #1E293B', paddingTop: '8px', width: '250px' }}>
                        Recibido por
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
}

export default SalidaPDF;