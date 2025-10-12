import React from 'react';
import { Rendimiento, ThreshingOrder } from '../types';

interface RendimientoDetailModalProps {
    rendimiento: Rendimiento;
    threshingOrders: ThreshingOrder[];
    onClose: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const RendimientoDetailModal: React.FC<RendimientoDetailModalProps> = ({ rendimiento, threshingOrders, onClose }) => {
    
    const getOrderNumbers = (orderIds: string[]) => {
        return orderIds.map(id => threshingOrders.find(o => o.id === id)?.orderNumber || id).join(', ');
    }
    
    const realDataSummary = React.useMemo(() => {
        const summaryByType: Record<string, number> = {};
        rendimiento.vignettes.forEach(v => {
            const peso = Number(v.pesoNeto) || 0;
            if (v.tipo) {
                summaryByType[v.tipo] = (summaryByType[v.tipo] || 0) + peso;
            }
        });
        return summaryByType;
    }, [rendimiento.vignettes]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-xl font-bold text-blue-600">Detalle de Rendimiento</h3>
                     <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div><p className="text-muted-foreground">Fecha de Creación</p><p className="font-medium text-foreground">{formatDate(rendimiento.creationDate)}</p></div>
                        <div><p className="text-muted-foreground">Órdenes de Trilla</p><p className="font-medium text-foreground">{getOrderNumbers(rendimiento.threshingOrderIds)}</p></div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 my-6">
                        <h4 className="text-lg font-semibold text-foreground mb-4">Comparación de Resultados</h4>
                         <table className="w-full text-sm bg-card rounded-lg">
                            <thead className="bg-muted"><tr className="font-bold"><td className="p-2">Concepto</td><td className="p-2 text-right">Proyectado</td><td className="p-2 text-right">Real</td><td className="p-2 text-right">Diferencia</td></tr></thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="p-2 font-semibold">Primeras</td>
                                    <td className="p-2 text-right">{rendimiento.totalProyectadoPrimeras.toFixed(2)}</td>
                                    <td className="p-2 text-right">{rendimiento.totalRealPrimeras.toFixed(2)}</td>
                                    <td className={`p-2 text-right font-bold ${rendimiento.totalRealPrimeras - rendimiento.totalProyectadoPrimeras < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{(rendimiento.totalRealPrimeras - rendimiento.totalProyectadoPrimeras).toFixed(2)}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="p-2 font-semibold">Catadura</td>
                                    <td className="p-2 text-right">{rendimiento.totalProyectadoCatadura.toFixed(2)}</td>
                                    <td className="p-2 text-right">{rendimiento.totalRealCatadura.toFixed(2)}</td>
                                     <td className={`p-2 text-right font-bold ${rendimiento.totalRealCatadura - rendimiento.totalProyectadoCatadura < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{(rendimiento.totalRealCatadura - rendimiento.totalProyectadoCatadura).toFixed(2)}</td>
                                </tr>
                                <tr className="font-bold bg-muted/80">
                                    <td className="p-2">Total</td>
                                    <td className="p-2 text-right">{(rendimiento.totalProyectadoPrimeras + rendimiento.totalProyectadoCatadura).toFixed(2)}</td>
                                    <td className="p-2 text-right">{(rendimiento.totalRealPrimeras + rendimiento.totalRealCatadura).toFixed(2)}</td>
                                    <td className="p-2 text-right">{((rendimiento.totalRealPrimeras + rendimiento.totalRealCatadura) - (rendimiento.totalProyectadoPrimeras + rendimiento.totalProyectadoCatadura)).toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h4 className="text-lg font-semibold text-foreground mt-6 mb-3">Viñetas Físicas</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted-foreground">
                            <thead className="text-xs uppercase bg-muted">
                                <tr>
                                    <th className="px-4 py-2">No. Viñeta</th>
                                    <th className="px-4 py-2">Tipo</th>
                                    <th className="px-4 py-2 text-right">Peso Neto Original</th>
                                    <th className="px-4 py-2">Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rendimiento.vignettes.map(v => (
                                    <tr key={v.id} className="border-b border-border">
                                        <td className="px-4 py-3 font-semibold">{v.numeroViñeta}</td>
                                        <td className="px-4 py-3">{v.tipo}</td>
                                        <td className="px-4 py-3 text-right">{(v.originalPesoNeto || v.pesoNeto).toFixed(2)}</td>
                                        <td className="px-4 py-3">{v.notas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex-shrink-0 flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default RendimientoDetailModal;