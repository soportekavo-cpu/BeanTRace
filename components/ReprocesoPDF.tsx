

import React from 'react';
import { Reproceso } from '../types';

interface ReprocesoPDFProps {
    reproceso: Reproceso;
}

const ReprocesoPDF: React.FC<ReprocesoPDFProps> = ({ reproceso }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #7C3AED', paddingBottom: '15px' }}>
                <div>
                    <h1 style={{ color: '#7C3AED', margin: 0, fontSize: '28px' }}>Reporte de Reproceso</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '16px' }}><strong>No. Reproceso:</strong> <span style={{ color: '#DC2626' }}>{reproceso.reprocesoNumber}</span></p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(reproceso.creationDate)}</p>
                </div>
            </header>

            {reproceso.totalProyectadoPrimeras !== undefined && (
                 <section style={{ marginTop: '30px', fontSize: '14px' }}>
                    <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Comparación Proyectado vs. Real</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f3f4f6' }}>
                            <tr>
                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Concepto</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Proyectado (qqs.)</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Real (qqs.)</th>
                                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Diferencia (qqs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>Primeras</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{reproceso.totalProyectadoPrimeras.toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(reproceso.totalRealPrimeras || 0).toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{((reproceso.totalRealPrimeras || 0) - reproceso.totalProyectadoPrimeras).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>Catadura</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(reproceso.totalProyectadoCatadura || 0).toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(reproceso.totalRealCatadura || 0).toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{((reproceso.totalRealCatadura || 0) - (reproceso.totalProyectadoCatadura || 0)).toFixed(2)}</td>
                            </tr>
                        </tbody>
                        <tfoot style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                            <tr>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>Total</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{((reproceso.totalProyectadoPrimeras || 0) + (reproceso.totalProyectadoCatadura || 0)).toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{reproceso.totalOutputWeight.toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(reproceso.totalOutputWeight - ((reproceso.totalProyectadoPrimeras || 0) + (reproceso.totalProyectadoCatadura || 0))).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>
            )}

            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                 <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Viñetas de Entrada</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                        <tr>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>No. Viñeta</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Peso Neto (qqs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reproceso.inputVignettesData.map(v => (
                            <tr key={v.id}>
                                <td style={{ padding: '10px', border: '1px solid #ddd', color: '#DC2626' }}>{v.numeroViñeta}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.tipo}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{v.pesoNeto.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
             <section style={{ marginTop: '30px', fontSize: '14px' }}>
                 <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Viñetas de Salida</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                        <tr>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>No. Viñeta</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Peso Neto Original (qqs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reproceso.outputVignettes.map(v => (
                            <tr key={v.id}>
                                <td style={{ padding: '10px', border: '1px solid #ddd', color: '#DC2626' }}>{v.numeroViñeta}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.tipo}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(v.originalPesoNeto || v.pesoNeto).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
            <section style={{ marginTop: '20px', fontSize: '14px', border: '2px solid #7C3AED', borderRadius: '5px', padding: '15px', display: 'flex', justifyContent: 'space-around', backgroundColor: '#f5f3ff' }}>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Peso Total Entrada</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '18px'}}>{reproceso.totalInputWeight.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Peso Total Salida</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '18px'}}>{reproceso.totalOutputWeight.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Merma</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '22px', color: reproceso.merma > 0.005 ? '#ef4444' : '#22c55e'}}>{reproceso.merma.toFixed(2)}</p>
                </div>
            </section>
             {reproceso.notes && (
                <section style={{ marginTop: '20px', fontSize: '14px' }}>
                    <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '10px', fontSize: '16px' }}>Notas</h2>
                    <p style={{whiteSpace: 'pre-wrap'}}>{reproceso.notes}</p>
                </section>
             )}
        </div>
    );
};

export default ReprocesoPDF;
