import React from 'react';
import { Mezcla } from '../types';

interface MezclaPDFProps {
    mezcla: Mezcla;
}

const MezclaPDF: React.FC<MezclaPDFProps> = ({ mezcla }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #7C3AED', paddingBottom: '15px' }}>
                <div>
                    <h1 style={{ color: '#7C3AED', margin: 0, fontSize: '28px' }}>Reporte de Mezcla</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '16px' }}><strong>No. Mezcla:</strong> {mezcla.mezclaNumber}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(mezcla.creationDate)}</p>
                    <p style={{ margin: '5px 0 0 0' }}><strong>Tipo:</strong> {mezcla.tipoMezcla}</p>
                </div>
            </header>

            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Viñetas de Entrada</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                        <tr>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>No. Viñeta</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Peso Utilizado (qqs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mezcla.inputVignettesData.map(v => (
                            <tr key={v.vignetteId}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.vignetteNumber}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.tipo}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{v.pesoUtilizado.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
            <section style={{ marginTop: '20px', fontSize: '14px', border: '2px solid #7C3AED', borderRadius: '5px', padding: '15px', display: 'flex', justifyContent: 'space-around', backgroundColor: '#f5f3ff' }}>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Peso Total Entrada</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '18px'}}>{mezcla.totalInputWeight.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Cantidad Despachada</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '18px'}}>{mezcla.cantidadDespachada.toFixed(2)}</p>
                </div>
                <div style={{textAlign: 'center'}}>
                    <p style={{margin: '0 0 5px 0', color: '#666', fontSize: '12px', textTransform: 'uppercase'}}>Sobrante en Bodega</p>
                    <p style={{margin: 0, fontWeight: 'bold', fontSize: '22px', color: '#22c55e'}}>{mezcla.sobranteEnBodega.toFixed(2)}</p>
                </div>
            </section>

            <footer style={{ position: 'absolute', bottom: '40px', width: 'calc(100% - 80px)', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '14px', borderTop: '1px solid #ccc' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ borderTop: '1px solid #333', paddingTop: '10px', width: '250px' }}>Revisado Por</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ borderTop: '1px solid #333', paddingTop: '10px', width: '250px' }}>Autorizado Por</p>
                </div>
            </footer>
        </div>
    );
};

export default MezclaPDF;