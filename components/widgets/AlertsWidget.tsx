import React, { useMemo } from 'react';
import { DashboardData } from '../../pages/DashboardPage';

const AlertsWidget: React.FC<{ data: DashboardData; onWidgetClick: (type: string, payload?: any) => void; }> = ({ data, onWidgetClick }) => {
    const { contracts, contractLots, vignettes } = data;

    const alerts = useMemo(() => {
        // Filter out lots from "Alquiler de Licencia" contracts
        const activeContracts = contracts.filter(c => !c.isServiceContract && !c.isFinished);
        const activeContractIds = new Set(activeContracts.map(c => c.id));
        const activeContractLots = contractLots.filter(l => activeContractIds.has(l.contractId));
        
        const pendingFixationLots = activeContractLots.filter(l => !l.fijacion || l.fijacion === 0);
        
        const chibolaInventory = vignettes
            .filter(v => (v.status === 'En Bodega' || v.status === 'Mezclada Parcialmente') && v.tipo.toLowerCase().includes('chibola'))
            .reduce((sum, v) => sum + v.pesoNeto, 0);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const nextMonth = (currentMonth + 1) % 12;
        const yearForNextMonth = nextMonth === 0 ? currentYear + 1 : currentYear;

        const monthMap: { [key: string]: number } = {
            enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
            julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
        };

        const upcomingShipments = contracts.filter(c => {
            if (c.isFinished || !c.shipmentMonth) return false;
            const parts = c.shipmentMonth.toLowerCase().split(' ');
            if (parts.length < 1) return false;

            const monthName = parts[0];
            const year = parts.length > 1 ? parseInt(parts[1], 10) : currentYear;
            const month = monthMap[monthName];

            if (month === undefined || isNaN(year)) return false;

            const isCurrentMonth = month === currentMonth && year === currentYear;
            const isNextMonth = month === nextMonth && year === yearForNextMonth;

            return isCurrentMonth || isNextMonth;
        });


        return { pendingFixationLots, chibolaInventory, upcomingShipments };

    }, [contracts, contractLots, vignettes]);

    const fixationText = alerts.pendingFixationLots.length === 1
        ? '1 Partida con fijación pendiente'
        : `${alerts.pendingFixationLots.length} Partidas con fijación pendiente`;

    const shipmentText = alerts.upcomingShipments.length === 1
        ? '1 Contrato con embarque próximo'
        : `${alerts.upcomingShipments.length} Contratos con embarque próximo`;


    return (
        <>
            <h3 className="text-lg font-semibold text-foreground mb-4">Alertas y Pendientes</h3>
            <div className="flex-grow flex flex-col justify-center space-y-3">
                {alerts.pendingFixationLots.length === 0 && alerts.chibolaInventory <= 25 && alerts.upcomingShipments.length === 0 ? (
                     <div className="text-center text-muted-foreground p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mt-2 font-medium">Todo en orden</p>
                        <p className="text-xs">No hay alertas ni pendientes urgentes.</p>
                    </div>
                ) : (
                    <>
                        {alerts.pendingFixationLots.length > 0 && (
                            <button onClick={() => onWidgetClick('fixations', alerts.pendingFixationLots)} className="w-full text-left flex items-center gap-3 p-3 text-sm font-medium rounded-lg border border-red-500 text-red-600 dark:text-red-400 animate-pulse-opacity hover:bg-red-500/10">
                                <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0" fill="currentColor"><path d="M12 2L2 22h20L12 2z" /></svg>
                                <span>{fixationText}</span>
                            </button>
                        )}
                         {alerts.upcomingShipments.length > 0 && (
                            <button onClick={() => onWidgetClick('upcomingShipments', alerts.upcomingShipments)} className="w-full text-left flex items-center gap-3 p-3 text-sm font-medium rounded-lg border border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>{shipmentText}</span>
                            </button>
                         )}
                         {alerts.chibolaInventory > 25 && (
                            <div className="flex items-center gap-3 p-3 text-sm font-medium rounded-lg border border-orange-500 text-orange-600 dark:text-orange-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" className="flex-shrink-0" fill="currentColor"><path d="M12 2L2 22h20L12 2z" /></svg>
                                <span>Inventario de Chibola ({alerts.chibolaInventory.toFixed(2)} qqs.) supera los 25 qqs.</span>
                            </div>
                         )}
                    </>
                )}
            </div>
        </>
    );
};

export default AlertsWidget;