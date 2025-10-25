import React from 'react';
import { Reproceso } from '../types';

interface ReprocesoDetailModalProps {
    reproceso: Reproceso;
    onClose: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const ReprocesoDetailModal: React.FC<ReprocesoDetailModalProps> = ({ reproceso, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                     <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-purple-600">Detalle de Reproceso: {reproceso.reprocesoNumber}</h3>
                        {reproceso.isFinalizado && <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">FINALIZADO</span>}
                    </div>
                     <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    <div>
                        <p className="text-sm"><strong>Fecha:</strong> {formatDate(reproceso.creationDate)}</p>
                    </div>

                    {reproceso.totalProyectadoPrimeras !== undefined && (
                        <div className="bg-muted/50 rounded-lg p-4">
                            <h4 className="font-semibold mb-2 text-foreground">Comparación de Rendimiento</h4>
                            <table className="w-full text-sm">
                                <thead><tr className="font-bold"><td className="pb-1">Concepto</td><td className="pb-1 text-right">Proyectado</td><td className="pb-1 text-right">Real</td><td className="pb-1 text-right">Diferencia</td></tr></thead>
                                <tbody>
                                    <tr className="border-t"><td className="pt-2 font-semibold">Primeras</td>
                                        <td className="pt-2 text-right">{reproceso.totalProyectadoPrimeras.toFixed(2)}</td>
                                        <td className="pt-2 text-right">{(reproceso.totalRealPrimeras || 0).toFixed(2)}</td>
                                        <td className={`pt-2 text-right font-bold ${(reproceso.totalRealPrimeras || 0) - reproceso.totalProyectadoPrimeras < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{((reproceso.totalRealPrimeras || 0) - reproceso.totalProyectadoPrimeras).toFixed(2)}</td>
                                    </tr>
                                    <tr><td className="pb-2 font-semibold">Catadura</td>
                                        <td className="pb-2 text-right">{(reproceso.totalProyectadoCatadura || 0).toFixed(2)}</td>
                                        <td className="pb-2 text-right">{(reproceso.totalRealCatadura || 0).toFixed(2)}</td>
                                        <td className={`pb-2 text-right font-bold ${(reproceso.totalRealCatadura || 0) - (reproceso.totalProyectadoCatadura || 0) < -0.005 ? 'text-red-500' : 'text-green-600'}`}>{((reproceso.totalRealCatadura || 0) - (reproceso.totalProyectadoCatadura || 0)).toFixed(2)}</td>
                                    </tr>
                                    <tr className="font-bold border-t"><td className="pt-2">Total</td>
                                        <td className="pt-2 text-right">{((reproceso.totalProyectadoPrimeras || 0) + (reproceso.totalProyectadoCatadura || 0)).toFixed(2)}</td>
                                        <td className="pt-2 text-right">{reproceso.totalOutputWeight.toFixed(2)}</td>
                                        <td className="pt-2 text-right">{(reproceso.totalOutputWeight - ((reproceso.totalProyectadoPrimeras || 0) + (reproceso.totalProyectadoCatadura || 0))).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Input Vignettes */}
                    <div>
                        <h4 className="text-lg font-semibold text-blue-600 mb-2">Viñetas de Entrada</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50"><tr><th className="p-2 text-left">No. Viñeta</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-right">Peso Neto</th></tr></thead>
                                <tbody>
                                    {reproceso.inputVignettesData.map(v => (
                                        <tr key={v.id} className="border-t"><td className="p-2 font-semibold text-red-500">{v.numeroViñeta}</td><td className="p-2">{v.tipo}</td><td className="p-2 text-right">{v.pesoNeto.toFixed(2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                     {/* Output Vignettes */}
                    <div>
                        <h4 className="text-lg font-semibold text-purple-600 mb-2">Viñetas de Salida</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50"><tr><th className="p-2 text-left">No. Viñeta</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-right">Peso Neto Original</th></tr></thead>
                                <tbody>
                                    {reproceso.outputVignettes.map(v => (
                                        <tr key={v.id} className="border-t"><td className="p-2 font-semibold text-red-500">{v.numeroViñeta}</td><td className="p-2">{v.tipo}</td><td className="p-2 text-right">{(v.originalPesoNeto || v.pesoNeto).toFixed(2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                         <div><p className="text-sm text-muted-foreground">Peso Total Entrada</p><p className="text-xl font-bold text-foreground">{reproceso.totalInputWeight.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Peso Total Salida</p><p className="text-xl font-bold text-foreground">{reproceso.totalOutputWeight.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Diferencia (Merma)</p><p className={`text-xl font-bold ${reproceso.merma > 0.005 ? 'text-red-500' : 'text-green-600'}`}>{reproceso.merma.toFixed(2)}</p></div>
                    </div>

                    {reproceso.notes && (
                         <div className="mt-6">
                            <h4 className="text-lg font-semibold text-foreground mb-2">Notas</h4>
                            <p className="text-sm p-3 bg-muted/50 rounded-md border whitespace-pre-wrap">{reproceso.notes}</p>
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default ReprocesoDetailModal;