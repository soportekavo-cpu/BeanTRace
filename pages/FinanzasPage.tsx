import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Factura, Buyer, ContractLot, Contract, Payment, Exporter } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import InvoicePDF from '../components/InvoicePDF';
import PrintManager from '../components/PrintManager';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const InvoiceFormModal: React.FC<{ onClose: () => void, buyers: Buyer[], existingFactura?: Factura | null }> = ({ onClose, buyers, existingFactura }) => {
    const [selectedBuyerId, setSelectedBuyerId] = useState(existingFactura?.buyerId || '');
    const [unpaidLots, setUnpaidLots] = useState<ContractLot[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set(existingFactura?.lotIds || []));
    const [notes, setNotes] = useState(existingFactura?.notes || '');
    const [issueDate, setIssueDate] = useState(existingFactura?.issueDate || new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(existingFactura?.dueDate || new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]);
    const [loadingLots, setLoadingLots] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isEditMode = !!existingFactura;

    useEffect(() => {
        const fetchLots = async () => {
            if (!selectedBuyerId) {
                setUnpaidLots([]);
                return;
            }
            setLoadingLots(true);
            const allContracts = await api.getCollection<Contract>('contracts', c => c.buyerId === selectedBuyerId);
            
            const lotsFilter = (l: ContractLot) => {
                if (isEditMode && existingFactura) {
                    // In edit mode, show already selected lots + any other unpaid lots for that buyer
                    return existingFactura.lotIds.includes(l.id!) || l.paymentStatus === 'unpaid';
                }
                // In create mode, only show unpaid lots
                return l.paymentStatus === 'unpaid';
            };

            const allLots = await api.getCollection<ContractLot>('contractLots', l => allContracts.some(c => c.id === l.contractId) && lotsFilter(l));
            
            setContracts(allContracts);
            setUnpaidLots(allLots);
            setLoadingLots(false);
        };
        fetchLots();
    }, [selectedBuyerId, isEditMode, existingFactura]);
    
    const handleLotToggle = (lotId: string) => {
        setSelectedLotIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lotId)) {
                newSet.delete(lotId);
            } else {
                newSet.add(lotId);
            }
            return newSet;
        });
    };
    
    const totalAmount = useMemo(() => {
        return unpaidLots.reduce((sum, lot) => {
            return selectedLotIds.has(lot.id!) ? sum + lot.valorCobro : sum;
        }, 0);
    }, [selectedLotIds, unpaidLots]);

    const getContractNumberForLot = (lot: ContractLot) => {
        return contracts.find(c => c.id === lot.contractId)?.contractNumber || 'N/A';
    }

    const handleSubmit = async (status: 'Draft' | 'Sent') => {
        if (!selectedBuyerId || selectedLotIds.size === 0) {
            alert("Por favor, selecciona un comprador y al menos una partida.");
            return;
        }
        setIsSaving(true);
        try {
            const buyerName = buyers.find(b => b.id === selectedBuyerId)?.name || '';
            const finalLotIds = [...selectedLotIds];

            if (isEditMode && existingFactura) {
                const updatedFactura = {
                    ...existingFactura,
                    buyerId: selectedBuyerId,
                    buyerName,
                    issueDate,
                    dueDate,
                    lotIds: finalLotIds,
                    totalAmount,
                    status,
                    notes,
                };
                await api.updateDocument<Factura>('facturas', existingFactura.id, updatedFactura);
                const originalLots = new Set(existingFactura.lotIds);
                const currentLots = new Set(finalLotIds);

                const addedLots = finalLotIds.filter(id => !originalLots.has(id));
                const removedLots = existingFactura.lotIds.filter(id => !currentLots.has(id));
                
                const addPromises = addedLots.map(lotId => api.updateDocument<ContractLot>('contractLots', lotId, { paymentStatus: 'in-progress' }));
                const resetPromises = removedLots.map(lotId => api.updateDocument<ContractLot>('contractLots', lotId, { paymentStatus: 'unpaid' }));
                await Promise.all([...addPromises, ...resetPromises]);

            } else {
                const allFacturas = await api.getCollection<Factura>('facturas');
                const facturaNumber = `INV-${new Date().getFullYear()}-${(allFacturas.length + 1).toString().padStart(4, '0')}`;
                const newFactura: Omit<Factura, 'id'> = {
                    facturaNumber,
                    buyerId: selectedBuyerId,
                    buyerName,
                    issueDate,
                    dueDate,
                    lotIds: finalLotIds,
                    totalAmount,
                    status,
                    notes,
                };
                await api.addDocument<Factura>('facturas', newFactura);
                const updatePromises = finalLotIds.map(lotId => 
                    api.updateDocument<ContractLot>('contractLots', lotId, { paymentStatus: 'in-progress' })
                );
                await Promise.all(updatePromises);
            }
            
            onClose();
        } catch (error) {
            console.error("Error saving invoice:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-foreground mb-4">{isEditMode ? 'Editar Factura' : 'Nueva Factura'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <select value={selectedBuyerId} onChange={e => setSelectedBuyerId(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input" disabled={isEditMode}>
                        <option value="">Seleccionar Cliente*</option>
                        {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <div><label className="text-xs text-muted-foreground">Fecha de Emisión</label><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                    <div><label className="text-xs text-muted-foreground">Fecha de Vencimiento</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                </div>
                <div className="flex-grow overflow-y-auto border-t border-b py-4">
                    <h4 className="font-semibold mb-2">Partidas a Facturar</h4>
                    {loadingLots ? <p>Cargando...</p> : unpaidLots.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead><tr className="text-left text-muted-foreground"><th className="p-2"></th><th className="p-2">Contrato</th><th className="p-2">Partida</th><th className="p-2 text-right">Valor a Cobrar</th></tr></thead>
                        <tbody>
                            {unpaidLots.map(lot => (
                                <tr key={lot.id} className="border-b hover:bg-muted/50">
                                    <td className="p-2"><input type="checkbox" checked={selectedLotIds.has(lot.id!)} onChange={() => handleLotToggle(lot.id!)} /></td>
                                    <td className="p-2">{getContractNumberForLot(lot)}</td>
                                    <td className="p-2 font-semibold text-green-600">{lot.partida}</td>
                                    <td className="p-2 text-right">${lot.valorCobro.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    ) : <p className="text-muted-foreground text-center py-4">No hay partidas pendientes para este cliente.</p>
                    }
                </div>
                <div className="pt-4 space-y-4">
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Términos y condiciones o notas..." className="w-full p-2 border rounded-md bg-background border-input min-h-[60px]"></textarea>
                    <div className="flex justify-between items-center">
                        <p className="text-lg font-bold">Total: <span className="text-green-600">${totalAmount.toFixed(2)}</span></p>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                            <button onClick={() => handleSubmit('Draft')} disabled={isSaving} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted disabled:opacity-50">Guardar Borrador</button>
                            <button onClick={() => handleSubmit('Sent')} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">{isSaving ? 'Guardando...' : 'Guardar y Enviar'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RegisterPaymentModal: React.FC<{ factura: Factura, balance: number, onClose: () => void }> = ({ factura, balance, onClose }) => {
    const [amount, setAmount] = useState(balance.toFixed(2));
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState<'Transferencia' | 'Cheque' | 'Efectivo' | 'Otro'>('Transferencia');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0 || amountNum > balance + 0.005) {
            alert('Por favor, ingresa un monto válido.');
            return;
        }
        setIsSaving(true);
        try {
            const newPayment: Omit<Payment, 'id'> = {
                facturaId: factura.id,
                date,
                amount: amountNum,
                method,
                reference,
                notes,
            };
            await api.addDocument<Payment>('payments', newPayment);
            
            const allPaymentsForInvoice = await api.getCollection<Payment>('payments', p => p.facturaId === factura.id);
            const totalPaid = allPaymentsForInvoice.reduce((sum, p) => sum + p.amount, 0);
            const newBalance = factura.totalAmount - totalPaid;

            let newStatus: Factura['status'] = 'Sent';
            if (newBalance <= 0.005) {
                newStatus = 'Paid';
            } else if (totalPaid > 0) {
                newStatus = 'PartiallyPaid';
            } else if (new Date(factura.dueDate) < new Date()) {
                newStatus = 'Overdue';
            }

            if (newStatus !== factura.status) {
                await api.updateDocument<Factura>('facturas', factura.id, { status: newStatus });
            }

            if (newStatus === 'Paid') {
                const updateLotPromises = factura.lotIds.map(lotId => 
                    api.updateDocument<ContractLot>('contractLots', lotId, { paymentStatus: 'paid' })
                );
                await Promise.all(updateLotPromises);
            }
            
            onClose();
        } catch (error) {
            console.error("Error registering payment and updating status:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-foreground mb-1">Registrar Pago para Factura {factura.facturaNumber}</h3>
                <p className="text-muted-foreground mb-4">Saldo pendiente: <span className="font-bold text-red-500">${balance.toFixed(2)}</span></p>
                <div className="space-y-4">
                     <div><label className="text-sm text-muted-foreground">Importe Recibido*</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                     <div><label className="text-sm text-muted-foreground">Fecha de Pago*</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                     <div><label className="text-sm text-muted-foreground">Forma de Pago</label><select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full p-2 border rounded-md bg-background border-input"><option>Transferencia</option><option>Cheque</option><option>Efectivo</option><option>Otro</option></select></div>
                     <div><label className="text-sm text-muted-foreground">N.° de Referencia</label><input type="text" value={reference} onChange={e => setReference(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input"/></div>
                     <div><label className="text-sm text-muted-foreground">Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded-md bg-background border-input min-h-[60px]"></textarea></div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">{isSaving ? 'Guardando...' : 'Guardar Pago'}</button>
                </div>
            </div>
        </div>
    );
};

type InvoicePrintData = {
    factura: Factura;
    buyer: Buyer;
    lots: ContractLot[];
    exporter: Exporter;
    contract: Contract;
};

const InvoiceDetailModal: React.FC<{ 
    factura: Factura, 
    payments: Payment[], 
    lots: ContractLot[], 
    contracts: Contract[], 
    exporters: Exporter[], 
    buyers: Buyer[], 
    onClose: () => void, 
    onDataChange: () => void,
    onStartPrint: (data: InvoicePrintData) => void,
}> = ({ factura, payments, lots, contracts, exporters, buyers, onClose, onDataChange, onStartPrint }) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const balance = factura.totalAmount - totalPaid;

    const handleGeneratePdf = () => {
        const buyerData = buyers.find(b => b.id === factura.buyerId);
        if (!buyerData) {
            alert("Error: No se encontró el comprador para esta factura.");
            return;
        }

        const associatedLots = lots.filter(l => factura.lotIds.includes(l.id!));
        if (associatedLots.length === 0) {
            alert("Error: Esta factura no tiene partidas válidas para mostrar en el PDF.");
            return;
        }

        const associatedContractIds = new Set(associatedLots.map(l => l.contractId));
        if (associatedContractIds.size > 1) {
            alert("Error: El PDF solo puede generarse para facturas con partidas de un único contrato. Por favor, cree facturas separadas.");
            return;
        }
        
        const contractId = associatedContractIds.values().next().value;
        const contractData = contracts.find(c => c.id === contractId);
        if (!contractData) {
            alert(`Error: No se pudo encontrar el contrato con ID ${contractId}.`);
            return;
        }
        
        const exporterData = exporters.find(e => e.id === contractData.exporterId);
        if (!exporterData) {
            alert(`Error: No se pudo encontrar la exportadora con ID ${contractData.exporterId}.`);
            return;
        }
        
        onStartPrint({
            factura,
            buyer: buyerData,
            lots: associatedLots,
            exporter: exporterData,
            contract: contractData,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Factura {factura.facturaNumber}</h3>
                        <p className="text-muted-foreground">{factura.buyerName}</p>
                    </div>
                     <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="grid grid-cols-4 gap-4 my-4 text-sm">
                    <div><p className="text-muted-foreground">Fecha Emisión</p><p>{formatDate(factura.issueDate)}</p></div>
                    <div><p className="text-muted-foreground">Fecha Vencimiento</p><p>{formatDate(factura.dueDate)}</p></div>
                    <div className="col-span-2 text-right">
                        <p className="text-2xl font-bold">${factura.totalAmount.toFixed(2)}</p>
                        <p className="font-semibold text-red-500">Saldo: ${balance.toFixed(2)}</p>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto border-t border-b py-4 space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">Partidas Incluidas</h4>
                        <table className="w-full text-sm"><tbody>{lots.filter(l => factura.lotIds.includes(l.id!)).map(l => <tr key={l.id}><td className="py-1">{l.partida}</td><td className="py-1 text-right">${l.valorCobro.toFixed(2)}</td></tr>)}</tbody></table>
                    </div>
                    {payments.length > 0 && <div>
                        <h4 className="font-semibold mb-2">Pagos Recibidos</h4>
                        <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Fecha</th><th>Monto</th><th>Método</th><th>Referencia</th></tr></thead><tbody>
                            {payments.map(p => <tr key={p.id} className="border-b"><td className="py-1">{formatDate(p.date)}</td><td className="py-1">${p.amount.toFixed(2)}</td><td className="py-1">{p.method}</td><td className="py-1">{p.reference}</td></tr>)}
                        </tbody></table>
                    </div>}
                </div>
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={handleGeneratePdf} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Generar PDF</button>
                    {balance > 0.005 && 
                        <button onClick={() => setShowPaymentModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Registrar Pago</button>
                    }
                </div>
                {showPaymentModal && <RegisterPaymentModal factura={factura} balance={balance} onClose={() => { setShowPaymentModal(false); onDataChange(); }} />}
            </div>
        </div>
    )
};

const FinanzasPage: React.FC = () => {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [lots, setLots] = useState<ContractLot[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvoiceForm, setShowInvoiceForm] = useState(false);
    const [facturaToEdit, setFacturaToEdit] = useState<Factura | null>(null);
    const [facturaToDelete, setFacturaToDelete] = useState<Factura | null>(null);
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
    const [invoiceToPrint, setInvoiceToPrint] = useState<InvoicePrintData | null>(null);

    const fetchData = async () => {
        try {
            const [facturasData, buyersData, paymentsData, lotsData, contractsData, exportersData] = await Promise.all([
                api.getCollection<Factura>('facturas'),
                api.getCollection<Buyer>('buyers'),
                api.getCollection<Payment>('payments'),
                api.getCollection<ContractLot>('contractLots'),
                api.getCollection<Contract>('contracts'),
                api.getCollection<Exporter>('exporters'),
            ]);
            setFacturas(facturasData.sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
            setBuyers(buyersData);
            setPayments(paymentsData);
            setLots(lotsData);
            setContracts(contractsData);
            setExporters(exportersData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        setLoading(true);
        fetchData();
    }, []);

    const invoiceCalculations = useMemo(() => {
        const paymentsByInvoiceId = payments.reduce((acc, p) => {
            if (!acc[p.facturaId]) acc[p.facturaId] = [];
            acc[p.facturaId].push(p);
            return acc;
        }, {} as Record<string, Payment[]>);

        return facturas.map(factura => {
            const relatedPayments = paymentsByInvoiceId[factura.id] || [];
            const totalPaid = relatedPayments.reduce((sum, p) => sum + p.amount, 0);
            const balance = factura.totalAmount - totalPaid;
            let status = factura.status;
            if (status !== 'Draft') {
                if (balance <= 0.005) status = 'Paid';
                else if (totalPaid > 0) status = 'PartiallyPaid';
                else if (new Date(factura.dueDate) < new Date() && balance > 0.005) status = 'Overdue';
                else status = 'Sent';
            }
            return { ...factura, totalPaid, balance, derivedStatus: status };
        });
    }, [facturas, payments]);

    const handleEditClick = (e: React.MouseEvent, factura: Factura) => {
        e.stopPropagation();
        setFacturaToEdit(factura);
        setShowInvoiceForm(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, factura: Factura) => {
        e.stopPropagation();
        setFacturaToDelete(factura);
    };

    const confirmDelete = async () => {
        if (!facturaToDelete) return;
        try {
            await api.deleteDocument('facturas', facturaToDelete.id);
            const updatePromises = facturaToDelete.lotIds.map(lotId =>
                api.updateDocument<ContractLot>('contractLots', lotId, { paymentStatus: 'unpaid' })
            );
            await Promise.all(updatePromises);
        } catch (error) {
            console.error("Error deleting invoice:", error);
        } finally {
            setFacturaToDelete(null);
            fetchData();
        }
    };

    const handlePrintFinished = () => {
        setInvoiceToPrint(null);
        setSelectedFactura(null); 
    };

    const StatusBadge: React.FC<{status: Factura['status']}> = ({ status }) => {
        const statusMap = {
            Draft: { text: 'Borrador', color: 'bg-gray-100 text-gray-800' },
            Sent: { text: 'Enviada', color: 'bg-blue-100 text-blue-800' },
            PartiallyPaid: { text: 'Pagada Parcialmente', color: 'bg-yellow-100 text-yellow-800' },
            Paid: { text: 'Pagada', color: 'bg-green-100 text-green-800' },
            Overdue: { text: 'Vencida', color: 'bg-red-100 text-red-800' },
        };
        const { text, color } = statusMap[status] || statusMap.Draft;
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{text}</span>;
    };

    return (
        <>
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-foreground">Facturación</h2>
                    <button onClick={() => { setFacturaToEdit(null); setShowInvoiceForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                        <PlusIcon className="w-4 h-4" /> Crear Factura
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-muted">
                            <tr>
                                <th className="px-6 py-3">N.° Factura</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">F. Emisión</th>
                                <th className="px-6 py-3">F. Vencim.</th>
                                <th className="px-6 py-3 text-right">Monto</th>
                                <th className="px-6 py-3 text-right">Saldo</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                                <th className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="text-center py-10">Cargando...</td></tr>
                        ) : invoiceCalculations.length > 0 ? (
                            invoiceCalculations.map(factura => (
                                <tr key={factura.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedFactura(factura)}>
                                    <td className="px-6 py-4 font-medium text-foreground">{factura.facturaNumber}</td>
                                    <td className="px-6 py-4">{factura.buyerName}</td>
                                    <td className="px-6 py-4">{formatDate(factura.issueDate)}</td>
                                    <td className="px-6 py-4">{formatDate(factura.dueDate)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">${factura.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-red-500">${factura.balance.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={factura.derivedStatus} /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button disabled={factura.derivedStatus !== 'Draft'} onClick={(e) => handleEditClick(e, factura)} className="text-yellow-500 hover:text-yellow-700 disabled:text-gray-400 disabled:cursor-not-allowed"><PencilIcon className="w-4 h-4" /></button>
                                            <button disabled={factura.derivedStatus !== 'Draft'} onClick={(e) => handleDeleteClick(e, factura)} className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} className="text-center py-10">No hay facturas. ¡Crea la primera!</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
            {showInvoiceForm && <InvoiceFormModal onClose={() => { setShowInvoiceForm(false); fetchData(); }} buyers={buyers} existingFactura={facturaToEdit} />}
            {selectedFactura &&
                <InvoiceDetailModal 
                    factura={selectedFactura} 
                    payments={payments.filter(p => p.facturaId === selectedFactura.id)}
                    lots={lots}
                    contracts={contracts}
                    exporters={exporters}
                    buyers={buyers}
                    onClose={() => setSelectedFactura(null)}
                    onDataChange={fetchData}
                    onStartPrint={setInvoiceToPrint}
                />
            }
            {facturaToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-card p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-foreground">Confirmar Eliminación</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ¿Estás seguro de que quieres eliminar la factura <strong>{facturaToDelete.facturaNumber}</strong>? Las partidas asociadas volverán al estado 'Pendiente'.
                        </p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setFacturaToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                            <button onClick={confirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Eliminar Factura</button>
                        </div>
                    </div>
                </div>
            )}
            {invoiceToPrint && (
                <PrintManager onFinished={handlePrintFinished}>
                    <InvoicePDF {...invoiceToPrint} />
                </PrintManager>
            )}
        </>
    );
};

export default FinanzasPage;