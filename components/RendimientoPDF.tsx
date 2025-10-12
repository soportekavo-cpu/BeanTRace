import React from 'react';
import { Rendimiento, ThreshingOrder } from '../types';

interface RendimientoPDFProps {
    rendimiento: Rendimiento;
    threshingOrders: ThreshingOrder[];
}

const RendimientoPDF: React.FC<RendimientoPDFProps> = ({ rendimiento, threshingOrders }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const orderNumbers = threshingOrders.map(o => o.orderNumber).join(', ');

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', padding: '40px', backgroundColor: '#fff', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1E40AF', paddingBottom: '15px' }}>
                <div>
                    <h1 style={{ color: '#1E40AF', margin: 0, fontSize: '28px' }}>Reporte de Rendimiento</h1>
                </div>
                <div style={{ textAlign: 'right', fontSize: '14px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(rendimiento.creationDate)}</p>
                </div>
            </header>

            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Órdenes de Trilla Liquidadas</h2>
                <p><strong>Órdenes Incluidas:</strong> {orderNumbers}</p>
            </section>
            
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
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{rendimiento.totalProyectadoPrimeras.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{rendimiento.totalRealPrimeras.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{(rendimiento.totalRealPrimeras - rendimiento.totalProyectadoPrimeras).toFixed(2)}</td>
                        </tr>
                         <tr>
                            <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>Catadura</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{rendimiento.totalProyectadoCatadura.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{rendimiento.totalRealCatadura.toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>{(rendimiento.totalRealCatadura - rendimiento.totalProyectadoCatadura).toFixed(2)}</td>
                        </tr>
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                         <tr>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>Total</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(rendimiento.totalProyectadoPrimeras + rendimiento.totalProyectadoCatadura).toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(rendimiento.totalRealPrimeras + rendimiento.totalRealCatadura).toFixed(2)}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{((rendimiento.totalRealPrimeras + rendimiento.totalRealCatadura) - (rendimiento.totalProyectadoPrimeras + rendimiento.totalProyectadoCatadura)).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
             </section>
            
            <section style={{ marginTop: '30px', fontSize: '14px' }}>
                 <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '15px', fontSize: '18px' }}>Detalle de Viñetas</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                        <tr>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>No. Viñeta</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tipo Subproducto</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Peso Neto Original (qqs.)</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rendimiento.vignettes.map(v => (
                            <tr key={v.id}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.numeroViñeta}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.tipo}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{(v.originalPesoNeto || v.pesoNeto).toFixed(2)}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.notas}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <footer style={{ marginTop: '80px', paddingTop: '20px', display: 'flex', justifyContent: 'space-around', fontSize: '14px', borderTop: '1px solid #ccc' }}>
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

export default RendimientoPDF;