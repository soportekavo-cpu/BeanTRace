import React from 'react';
import { Salida } from '../types';

interface SalidaPDFProps {
    salida: Salida;
}

const SalidaPDF: React.FC<SalidaPDFProps> = ({ salida }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #16a34a', paddingBottom: '10px' }}>
                <div>
                    <h1 style={{ color: '#15803d', margin: 0, fontSize: '24px' }}>Guía de Despacho</h1>
                    <p style={{ margin: 0 }}><strong>Envío No:</strong> {salida.salidaNumber}</p>
                </div>
                <p><strong>Fecha:</strong> {formatDate(salida.fecha)}</p>
            </header>
            <main>
                <section style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
                    <div>
                        <h4>Enviado a</h4>
                        <p>{salida.clienteName || 'N/A'}</p>
                    </div>
                    <div>
                        <h4>Transporte</h4>
                        <p><strong>Piloto:</strong> {salida.piloto || 'N/A'}</p>
                        <p><strong>Placa:</strong> {salida.placaVehiculo || 'N/A'}</p>
                    </div>
                </section>
                <section style={{ marginTop: '30px' }}>
                    <h4>Detalle de Carga</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ backgroundColor: '#f0f0f0' }}>
                            <tr>
                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Descripción</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Sacos Yute</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Sacos Nylon</th>
                                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Peso Neto (qqs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                           {salida.tipoSalida === 'Mezcla' && salida.mezclas?.map((m, i) => (
                               <tr key={i}>
                                   <td style={{ padding: '8px', border: '1px solid #ddd' }}>{m.descripcionEnvio || m.mezclaNumber}</td>
                                   <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{m.sacosYute}</td>
                                   <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{m.sacosNylon}</td>
                                   <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{m.pesoUtilizado.toFixed(2)}</td>
                               </tr>
                           ))}
                           {salida.tipoSalida === 'Devolución Recibo' && salida.recibos?.map((r, i) => (
                               <tr key={i}>
                                   <td style={{ padding: '8px', border: '1px solid #ddd' }}>{`${r.descripcionDevolucion || `Devolución Recibo ${r.reciboNumber}`} (${r.tipoCafe})`}</td>
                                   <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{r.sacosYute}</td>
                                   <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{r.sacosNylon}</td>
                                   <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{r.pesoDevuelto.toFixed(2)}</td>
                               </tr>
                           ))}
                        </tbody>
                         <tfoot style={{fontWeight: 'bold'}}>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Totales:</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{salida.sacosYute}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{salida.sacosNylon}</td>
                                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{salida.pesoNeto.toFixed(2)}</td>
                            </tr>
                         </tfoot>
                    </table>
                </section>
                <section style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {salida.notas && (
                        <div style={{ flex: 1, marginRight: '20px', fontSize: '14px' }}>
                            <h4>Notas</h4>
                            <p style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', minHeight: '80px', whiteSpace: 'pre-wrap' }}>{salida.notas}</p>
                        </div>
                    )}
                     <div style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '5px', width: '250px', fontSize: '14px' }}>
                        <h4>Resumen de Pesos</h4>
                        <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Peso Neto:</span> <strong>{salida.pesoNeto.toFixed(2)} qqs.</strong></p>
                        <p style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tara:</span> <strong>{salida.tara.toFixed(2)} qqs.</strong></p>
                        <p style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '5px', marginTop: '5px' }}><span>Peso Bruto:</span> <strong style={{fontSize: '1.2em'}}>{salida.pesoBruto.toFixed(2)} qqs.</strong></p>
                    </div>
                </section>
            </main>
            <footer style={{ marginTop: '80px', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '14px', borderTop: '1px solid #ccc' }}>
                <div style={{ textAlign: 'center' }}><p style={{ borderTop: '1px solid #333', paddingTop: '10px', width: '250px' }}>Entregado por</p></div>
                <div style={{ textAlign: 'center' }}><p style={{ borderTop: '1px solid #333', paddingTop: '10px', width: '250px' }}>Recibido por</p></div>
            </footer>
        </div>
    );
}

export default SalidaPDF;