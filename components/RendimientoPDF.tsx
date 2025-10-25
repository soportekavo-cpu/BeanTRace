

import React from 'react';
import { Rendimiento, ThreshingOrder, Contract, ContractLot } from '../types';

interface RendimientoPDFProps {
    rendimiento: Rendimiento;
    threshingOrders: ThreshingOrder[];
    contracts: Contract[];
    contractLots: ContractLot[];
}

const RendimientoPDF: React.FC<RendimientoPDFProps> = ({ rendimiento, threshingOrders, contracts, contractLots }) => {
    const formatDate = (dateString: string) => {
        if (!dateString || !dateString.includes('-')) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const mainStyle: React.CSSProperties = {
        fontFamily: 'Arial, sans-serif',
        color: '#333',
        padding: '30px',
        backgroundColor: '#fff',
        width: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        fontSize: '10px',
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '3px solid #1E40AF',
        paddingBottom: '15px',
    };
    
    const h1Style: React.CSSProperties = {
        color: '#1E40AF',
        margin: 0,
        fontSize: '24px',
    };

    const sectionStyle: React.CSSProperties = {
        marginTop: '20px',
        pageBreakInside: 'avoid',
    };
    
    const h2_base: React.CSSProperties = {
        borderBottom: '1px solid #D1D5DB', // gray-300
        paddingBottom: '8px',
        marginBottom: '10px',
        fontSize: '14px',
        fontWeight: 'bold',
    };

    const h2_Themes = {
        slate: { ...h2_base, color: '#475569' }, // slate-600
        purple: { ...h2_base, color: '#7C3AED' }, // purple-600
        green: { ...h2_base, color: '#16A34A' }, // green-600
    };
    
    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9px',
    };

    const th_base: React.CSSProperties = {
        padding: '8px',
        border: '1px solid #D1D5DB',
        textAlign: 'left',
        fontWeight: 'bold',
    };

    const th_Themes = {
        slate: { ...th_base, backgroundColor: '#F1F5F9', color: '#334155' }, // slate-100, slate-700
        purple: { ...th_base, backgroundColor: '#F5F3FF', color: '#5B21B6' }, // purple-50, purple-800
        green: { ...th_base, backgroundColor: '#F0FDF4', color: '#15803D' }, // green-50, green-800
    };
    
    const tdStyle: React.CSSProperties = {
        padding: '6px 8px',
        border: '1px solid #D1D5DB',
        textAlign: 'left',
    };

    const trStyle: React.CSSProperties = {
        pageBreakInside: 'avoid',
    };

    return (
        <div style={mainStyle}>
            <header style={headerStyle}>
                <div>
                    <h1 style={h1Style}>Reporte de Rendimiento</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}><strong>No. Rendimiento:</strong> <span style={{ color: '#DC2626' }}>{rendimiento.rendimientoNumber}</span></p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    <p style={{ margin: 0 }}><strong>Fecha:</strong> {formatDate(rendimiento.creationDate)}</p>
                </div>
            </header>

            <section style={sectionStyle}>
                <h2 style={h2_Themes.slate}>Órdenes de Trilla Liquidadas</h2>
                 <table style={tableStyle}>
                    <thead style={{ display: 'table-header-group' }}>
                        <tr>
                            <th style={th_Themes.slate}>No. Orden</th>
                            <th style={th_Themes.slate}>Contrato</th>
                            <th style={th_Themes.slate}>Tipo Café</th>
                            <th style={th_Themes.slate}>Partidas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {threshingOrders.map(order => {
                            const contract = contracts.find(c => c.id === order.contractId);
                            const partidas = order.lotIds.map(lotId => contractLots.find(l => l.id === lotId)?.partida || 'N/A').join(', ');
                            return (
                                <tr key={order.id} style={trStyle}>
                                    <td style={{...tdStyle, color: '#DC2626'}}>{order.orderNumber}</td>
                                    <td style={{...tdStyle, color: '#DC2626'}}>{contract?.contractNumber || 'Venta Local'}</td>
                                    <td style={{...tdStyle, color: '#166534'}}>{contract?.coffeeType || order.tipoCafe || 'N/A'}</td>
                                    <td style={{...tdStyle, color: '#DC2626'}}>{partidas}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
            
             <section style={sectionStyle}>
                <h2 style={h2_Themes.purple}>Comparación Proyectado vs. Real</h2>
                <table style={tableStyle}>
                    <thead style={{ display: 'table-header-group' }}>
                        <tr>
                            <th style={th_Themes.purple}>Concepto</th>
                            <th style={{ ...th_Themes.purple, textAlign: 'right' }}>Proyectado (qqs.)</th>
                            <th style={{ ...th_Themes.purple, textAlign: 'right' }}>Real (qqs.)</th>
                            <th style={{ ...th_Themes.purple, textAlign: 'right' }}>Diferencia (qqs.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={trStyle}>
                            <td style={{ ...tdStyle, fontWeight: 'bold' }}>Primeras</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{rendimiento.totalProyectadoPrimeras.toFixed(2)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{rendimiento.totalRealPrimeras.toFixed(2)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: (rendimiento.totalRealPrimeras - rendimiento.totalProyectadoPrimeras) < -0.005 ? '#EF4444' : '#22C55E' }}>
                                {(rendimiento.totalRealPrimeras - rendimiento.totalProyectadoPrimeras).toFixed(2)}
                            </td>
                        </tr>
                         <tr style={trStyle}>
                            <td style={{ ...tdStyle, fontWeight: 'bold' }}>Catadura</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{rendimiento.totalProyectadoCatadura.toFixed(2)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{rendimiento.totalRealCatadura.toFixed(2)}</td>
                             <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: (rendimiento.totalRealCatadura - rendimiento.totalProyectadoCatadura) < -0.005 ? '#EF4444' : '#22C55E' }}>
                                {(rendimiento.totalRealCatadura - rendimiento.totalProyectadoCatadura).toFixed(2)}
                             </td>
                        </tr>
                    </tbody>
                    <tfoot style={{ backgroundColor: '#F9FAFB', fontWeight: 'bold' }}>
                         <tr style={trStyle}>
                            <td style={tdStyle}>Total</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{(rendimiento.totalProyectadoPrimeras + rendimiento.totalProyectadoCatadura).toFixed(2)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{(rendimiento.totalRealPrimeras + rendimiento.totalRealCatadura).toFixed(2)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{((rendimiento.totalRealPrimeras + rendimiento.totalRealCatadura) - (rendimiento.totalProyectadoPrimeras + rendimiento.totalProyectadoCatadura)).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
             </section>
            
            <section style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginTop: '20px', pageBreakBefore: 'auto' }}>
                 <h2 style={h2_Themes.green}>Detalle de Viñetas</h2>
                <table style={tableStyle}>
                    <thead style={{ display: 'table-header-group' }}>
                        <tr>
                            <th style={th_Themes.green}>No. Viñeta</th>
                            <th style={th_Themes.green}>Tipo Subproducto</th>
                            <th style={{ ...th_Themes.green, textAlign: 'right' }}>Peso Neto Original (qqs.)</th>
                            <th style={th_Themes.green}>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rendimiento.vignettes.map(v => (
                            <tr key={v.id} style={trStyle}>
                                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#DC2626' }}>{v.numeroViñeta}</td>
                                <td style={{...tdStyle, color: '#166534'}}>{v.tipo}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{(v.originalPesoNeto || v.pesoNeto).toFixed(2)}</td>
                                <td style={tdStyle}>{v.notas}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default RendimientoPDF;
