
import React, { useState, useMemo } from 'react';
import { Page } from '../pages/DashboardLayout';
import XIcon from './icons/XIcon';
import FileIcon from './icons/FileIcon';

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    isLoading: boolean;
    onResultClick: (page: Page, targetId: string, parentId?: string, tab?: string) => void;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, data, isLoading, onResultClick }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const searchResults = useMemo(() => {
        if (!searchTerm || !data) return [];
        const term = searchTerm.toLowerCase();
        
        const results = [];

        // Contracts
        results.push(...data.contracts
            .filter((c: any) => c.contractNumber.toLowerCase().includes(term))
            .map((c: any) => ({ type: 'Contrato', id: c.id, name: c.contractNumber, page: 'contracts' as Page, details: c.buyerName }))
        );
        // Contract Lots (Partidas)
        results.push(...data.contractLots
            .filter((l: any) => l.partida.toLowerCase().includes(term))
            .map((l: any) => {
                const contract = data.contracts.find((c: any) => c.id === l.contractId);
                return {
                    type: 'Partida',
                    id: l.id,
                    parentId: l.contractId,
                    name: l.partida,
                    page: 'contracts' as Page,
                    details: `Contrato: ${contract?.contractNumber || 'N/A'}`
                };
            })
        );
        // Purchase Receipts
        results.push(...data.purchaseReceipts
            .filter((r: any) => r.recibo.toLowerCase().includes(term))
            .map((r: any) => ({ type: 'Recibo', id: r.id, name: r.recibo, page: 'ingreso' as Page, details: r.proveedorName }))
        );
        // Vignettes
        results.push(...data.vignettes
            .filter((v: any) => v.numeroViñeta.toLowerCase().includes(term))
            .map((v: any) => ({ type: 'Viñeta', id: v.id, name: v.numeroViñeta, page: 'rendimientos' as Page, details: v.tipo, tab: 'inventario' }))
        );
         // Threshing Orders
        results.push(...data.threshingOrders
            .filter((o: any) => o.orderNumber.toLowerCase().includes(term))
            .map((o: any) => ({ 
                type: 'Orden de Trilla', 
                id: o.id, 
                name: o.orderNumber, 
                page: o.orderType === 'Exportación' ? 'contracts' : 'ventasLocales' as Page, 
                details: o.clientName || 'Exportación',
            }))
        );
        // Mezclas
        results.push(...data.mezclas
            .filter((m: any) => m.mezclaNumber.toLowerCase().includes(term))
            .map((m: any) => ({ type: 'Mezcla', id: m.id, name: m.mezclaNumber, page: 'mezclas' as Page, details: m.tipoMezcla }))
        );
        // Salidas
        results.push(...data.salidas
            .filter((s: any) => s.salidaNumber.toLowerCase().includes(term))
            .map((s: any) => ({ type: 'Salida', id: s.id, name: s.salidaNumber, page: 'salidas' as Page, details: s.clienteName, tab: s.tipoSalida === 'Mezcla' ? 'mezclas' : 'recibos' }))
        );
        // Rendimientos
        results.push(...data.rendimientos
            .filter((r: any) => r.rendimientoNumber.toLowerCase().includes(term))
            .map((r: any) => ({ type: 'Rendimiento', id: r.id, name: r.rendimientoNumber, page: 'rendimientos' as Page, tab: 'resumen', details: `${r.vignettes.length} viñetas` }))
        );
        // Reprocesos
        results.push(...data.reprocesos
            .filter((r: any) => r.reprocesoNumber.toLowerCase().includes(term))
            .map((r: any) => ({ type: 'Reproceso', id: r.id, name: r.reprocesoNumber, page: 'rendimientos' as Page, tab: 'reprocesos', details: `Salida: ${r.totalOutputWeight.toFixed(2)} qqs.` }))
        );

        return results;
    }, [searchTerm, data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-start pt-20 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-2xl max-w-2xl w-full flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()} style={{animationDuration: '0.2s', maxHeight: '70vh'}}>
                <div className="p-4 flex-shrink-0">
                     <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar en toda la aplicación..."
                            autoFocus
                            className="w-full h-12 pl-12 pr-4 bg-muted/50 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
                        />
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto border-t">
                    {isLoading ? (
                        <p className="text-center p-6 text-muted-foreground">Cargando datos...</p>
                    ) : searchResults.length > 0 ? (
                        <ul>
                            {searchResults.map(result => (
                                <li key={`${result.page}-${result.id}-${result.name}`}>
                                    <button onClick={() => onResultClick(result.page, result.id, result.parentId, result.tab)} className="w-full flex items-center gap-4 text-left p-4 hover:bg-muted/50 transition-colors border-b">
                                        <FileIcon className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold text-foreground">{result.name} <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{result.type}</span></p>
                                            <p className="text-sm text-muted-foreground">{result.details}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : searchTerm ? (
                         <p className="text-center p-16 text-muted-foreground">No se encontraron resultados para "{searchTerm}"</p>
                    ) : (
                        <p className="text-center p-16 text-muted-foreground">Comienza a escribir para buscar...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;