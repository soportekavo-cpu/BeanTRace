
import React, { useState, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import api, { addDataChangeListener, removeDataChangeListener } from '../services/localStorageManager';
import { PurchaseReceipt, Supplier } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ReceiptForm from '../components/ReceiptForm';
import ReceiptPDF from '../components/ReceiptPDF';
import EyeIcon from '../components/icons/EyeIcon';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const CalculatedFieldDisplay: React.FC<{ label: string, value: string | number, isPercentage?: boolean, isCurrency?: boolean, className?: string }> = ({ label, value, isPercentage, isCurrency, className = '' }) => (
    <div className={className}>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">
            {typeof value === 'number'
                ? `${isCurrency ? 'Q' : ''}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${isPercentage ? '%' : ''}`
                : value
            }
        </p>
    </div>
);


const ReceiptDetailModal: React.FC<{ receipt: PurchaseReceipt; supplier: Supplier | undefined; onClose: () => void; onGeneratePdf: (receipt: PurchaseReceipt) => void; }> = ({ receipt, supplier, onClose, onGeneratePdf }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                 {receipt.status === 'Anulado' && (
                    <div className="absolute top-6 right-6 bg-red-100 text-red-800 text-sm font-bold px-4 py-2 rounded-lg transform -rotate-6 shadow-md border border-red-200 z-10">
                        ANULADO
                    </div>
                )}
                 <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h3 className="text-xl font-bold text-foreground">Detalle del Recibo: <span className="text-green-600">{receipt.recibo}</span></h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="space-y-6 text-sm">
                    {/* General */}
                    <div className="border-b pb-4">
                        <h4 className="text-lg font-semibold text-foreground mb-3">Información General</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CalculatedFieldDisplay label="Fecha" value={formatDate(receipt.fecha)} />
                            <CalculatedFieldDisplay label="Proveedor" value={supplier?.name || 'N/A'} />
                            <CalculatedFieldDisplay label="Placa del Vehículo" value={receipt.placaVehiculo} />
                            <CalculatedFieldDisplay label="Piloto" value={receipt.piloto} />
                            <CalculatedFieldDisplay label="Certificaciones" value={receipt.certificacion.join(', ') || 'N/A'} className="col-span-full"/>
                        </div>
                    </div>
                    {/* Pesos */}
                    <div className="border-b pb-4">
                        <h4 className="text-lg font-semibold text-foreground mb-3">Detalle del Café y Pesos</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CalculatedFieldDisplay label="Tipo de Café" value={receipt.tipo === 'Otro' ? receipt.customTipo || receipt.tipo : receipt.tipo} />
                            <CalculatedFieldDisplay label="Peso Bruto" value={receipt.pesoBruto} />
                            <CalculatedFieldDisplay label="Yute (sacos)" value={receipt.yute} />
                            <CalculatedFieldDisplay label="Nylon (Sacos)" value={receipt.nylon} />
                            <CalculatedFieldDisplay label="Tara" value={receipt.tara} />
                            <CalculatedFieldDisplay label="Peso Neto" value={receipt.pesoNeto} />
                        </div>
                    </div>
                     {/* Analisis */}
                    <div className="border-b pb-4">
                        <h4 className="text-lg font-semibold text-foreground mb-3">Análisis de Calidad y Rendimiento</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CalculatedFieldDisplay label="g Muestra" value={receipt.gMuestra} />
                            <CalculatedFieldDisplay label="g Primera" value={receipt.gPrimera} />
                            <CalculatedFieldDisplay label="g Rechazo" value={receipt.gRechazo} />
                            <div />
                            <CalculatedFieldDisplay label="Primera" value={receipt.primera} />
                            <CalculatedFieldDisplay label="Rechazo" value={receipt.rechazo} />
                            <CalculatedFieldDisplay label="Total Bruto" value={receipt.totalBruto} />
                            <div />
                            <CalculatedFieldDisplay label="% Rendimiento Total" value={receipt.rendimientoTotal} isPercentage />
                            <CalculatedFieldDisplay label="% Rendimiento Primera" value={receipt.rendimientoPrimera} isPercentage />
                            <CalculatedFieldDisplay label="% Rendimiento Rechazo" value={receipt.rendimientoRechazo} isPercentage />
                        </div>
                    </div>
                     {/* Catacion */}
                     {receipt.cuppingProfile && (
                        <div className="border-b pb-4">
                            <h4 className="text-lg font-semibold text-foreground mb-3">Perfil de Catación</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <CalculatedFieldDisplay label="Puntaje Final (SCA)" value={receipt.cuppingProfile.score} className="text-lg font-bold text-blue-500" />
                                <CalculatedFieldDisplay label="Nivel de Tueste" value={receipt.cuppingProfile.roastLevel} />
                                <CalculatedFieldDisplay label="Fecha Catación" value={formatDate(receipt.cuppingProfile.cuppingDate)} />
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
                                <CalculatedFieldDisplay label="Fragancia/Aroma" value={receipt.cuppingProfile.fragranceAroma} />
                                <CalculatedFieldDisplay label="Sabor" value={receipt.cuppingProfile.flavor} />
                                <CalculatedFieldDisplay label="Sabor Residual" value={receipt.cuppingProfile.aftertaste} />
                                <CalculatedFieldDisplay label="Acidez" value={receipt.cuppingProfile.acidity} />
                                <CalculatedFieldDisplay label="Cuerpo" value={receipt.cuppingProfile.body} />
                                <CalculatedFieldDisplay label="Balance" value={receipt.cuppingProfile.balance} />
                                <CalculatedFieldDisplay label="Uniformidad" value={receipt.cuppingProfile.uniformity} />
                                <CalculatedFieldDisplay label="Taza Limpia" value={receipt.cuppingProfile.cleanCup} />
                                <CalculatedFieldDisplay label="Dulzura" value={receipt.cuppingProfile.sweetness} />
                            </div>
                            <div className="mt-4">
                                <CalculatedFieldDisplay label="Notas del Catador" value={receipt.cuppingProfile.notes} />
                            </div>
                             <div className="mt-4">
                                <CalculatedFieldDisplay label="Defectos" value={receipt.cuppingProfile.defects} />
                            </div>
                        </div>
                     )}
                    {/* Costos */}
                    <div>
                        <h4 className="text-lg font-semibold text-foreground mb-3">Costos y Almacenamiento</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CalculatedFieldDisplay label="Precio (Q)" value={receipt.precio} isCurrency />
                            <CalculatedFieldDisplay label="Total Compra (Q)" value={receipt.totalCompra} isCurrency />
                            <CalculatedFieldDisplay label="Precio Catadura (Q)" value={receipt.precioCatadura} isCurrency />
                            <CalculatedFieldDisplay label="Costo Catadura (Q)" value={receipt.costoCatadura} isCurrency />
                             <CalculatedFieldDisplay label="Peso Bruto Envío" value={receipt.pesoBrutoEnvio} />
                             <CalculatedFieldDisplay label="Diferencia" value={receipt.diferencia} />
                             <div className="md:col-span-2" />
                             <CalculatedFieldDisplay label="Trillado" value={receipt.trillado} />
                             <CalculatedFieldDisplay label="En Bodega" value={receipt.enBodega} />
                             <CalculatedFieldDisplay label="Recibo Devuelto" value={receipt.reciboDevuelto ? 'Sí' : 'No'} />
                             <CalculatedFieldDisplay label="Notas" value={receipt.notas} className="col-span-full"/>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={() => onGeneratePdf(receipt)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted disabled:bg-muted/50 disabled:cursor-not-allowed" disabled={receipt.status === 'Anulado'}>
                        Generar PDF
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const IngresoPage: React.FC = () => {
    const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [receiptToEdit, setReceiptToEdit] = useState<PurchaseReceipt | null>(null);
    const [receiptToVoid, setReceiptToVoid] = useState<PurchaseReceipt | null>(null);
    const [receiptToView, setReceiptToView] = useState<PurchaseReceipt | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [receiptsData, suppliersData] = await Promise.all([
                api.getCollection<PurchaseReceipt>('purchaseReceipts'),
                api.getCollection<Supplier>('suppliers')
            ]);
            setReceipts(receiptsData.sort((a, b) => parseInt(b.recibo) - parseInt(a.recibo)));
            setSuppliers(suppliersData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['purchaseReceipts', 'suppliers'].includes(customEvent.detail.collectionName)) {
                fetchData();
            }
        };
        addDataChangeListener(handleDataChange);
        return () => removeDataChangeListener(handleDataChange);
    }, []);

    const handleEdit = (receipt: PurchaseReceipt) => {
        setReceiptToEdit(receipt);
        setShowForm(true);
    };

    const handleVoidClick = (receipt: PurchaseReceipt) => {
        setReceiptToVoid(receipt);
    };

    const confirmVoid = async () => {
        if (!receiptToVoid) return;
        try {
            // FIX: Explicitly specify the generic type for updateDocument to ensure type safety.
            await api.updateDocument<PurchaseReceipt>('purchaseReceipts', receiptToVoid.id, { status: 'Anulado' });
        } catch (error) {
            console.error("Error voiding receipt:", error);
        } finally {
            setReceiptToVoid(null);
        }
    };
    
    const handleSaveSuccess = (savedReceipt: PurchaseReceipt) => {
        setShowForm(false);
        setReceiptToEdit(null);
        // Open detail view instead of directly trying to print, which avoids popup blockers
        setReceiptToView(savedReceipt);
    };

    const generatePdf = (receipt: PurchaseReceipt) => {
        const supplier = suppliers.find(s => s.id === receipt.proveedorId);
        if(!supplier) {
            alert("Proveedor no encontrado, no se puede generar el PDF.");
            return;
        }

        const pdfHtml = ReactDOMServer.renderToString(
            <ReceiptPDF receipt={receipt} supplier={supplier} />
        );

        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head><title>Recibo ${receipt.recibo}</title></head>
                    <body>${pdfHtml}</body>
                </html>
            `);
            newWindow.document.close();
            newWindow.print();
        }
    };

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'N/A';

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Ingreso de Café</h2>
                <button 
                    onClick={() => { setReceiptToEdit(null); setShowForm(true); }} 
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    <PlusIcon className="w-4 h-4" /> Crear Recibo
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th className="px-6 py-3">Recibo</th>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Proveedor</th>
                            <th className="px-6 py-3 text-right">Peso Neto</th>
                            <th className="px-6 py-3 text-right">Total Compra</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10">Cargando recibos...</td></tr>
                        ) : receipts.length > 0 ? (
                            receipts.map((receipt) => (
                                <tr key={receipt.id} 
                                    className={`border-b border-border transition-colors ${receipt.status === 'Anulado' ? 'bg-red-500/5 text-muted-foreground line-through' : 'hover:bg-muted/50 cursor-pointer'}`} 
                                    onClick={() => setReceiptToView(receipt)}>
                                    <td className="px-6 py-4 font-medium text-foreground">{receipt.recibo}</td>
                                    <td className="px-6 py-4">{formatDate(receipt.fecha)}</td>
                                    <td className="px-6 py-4">{getSupplierName(receipt.proveedorId)}</td>
                                    <td className="px-6 py-4 text-right">{receipt.pesoNeto.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">Q{receipt.totalCompra.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button 
                                                className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                onClick={(e) => { e.stopPropagation(); generatePdf(receipt); }}
                                                disabled={receipt.status === 'Anulado'}
                                                title="Ver PDF">
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(receipt); }}
                                                disabled={receipt.status === 'Anulado'}
                                                title="Editar Recibo">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                onClick={(e) => { e.stopPropagation(); handleVoidClick(receipt); }}
                                                disabled={receipt.status === 'Anulado'}
                                                title={receipt.status === 'Anulado' ? 'Recibo ya anulado' : 'Anular recibo'}>
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={6} className="text-center py-10">No hay recibos para mostrar. ¡Crea el primero!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {showForm && (
                <ReceiptForm 
                    existingReceipt={receiptToEdit}
                    suppliers={suppliers}
                    onCancel={() => { setShowForm(false); setReceiptToEdit(null); }}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}

            {receiptToView && (
                <ReceiptDetailModal
                    receipt={receiptToView}
                    supplier={suppliers.find(s => s.id === receiptToView.proveedorId)}
                    onClose={() => setReceiptToView(null)}
                    onGeneratePdf={generatePdf}
                />
            )}

            {receiptToVoid && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Anulación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres anular el recibo <strong>{receiptToVoid.recibo}</strong>? Esta acción no se puede deshacer y el número de recibo no podrá ser reutilizado.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setReceiptToVoid(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                                Cancelar
                            </button>
                            <button onClick={confirmVoid} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                                Anular Recibo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngresoPage;