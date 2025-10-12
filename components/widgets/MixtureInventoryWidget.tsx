import React, { useMemo } from 'react';
import { DashboardData } from '../../pages/DashboardPage';
import DoughnutChart from '../charts/DoughnutChart';
import { formatNumber } from '../../utils/formatting';

const MixtureInventoryWidget: React.FC<{ data: DashboardData; onWidgetClick: (type: string, payload?: any) => void; }> = ({ data, onWidgetClick }) => {
    
    const chartData = useMemo(() => {
        const inventoryMap: Record<string, number> = {};
        data.mezclas.forEach(mezcla => {
            if (mezcla.status === 'Activo' && mezcla.sobranteEnBodega > 0.005) {
                inventoryMap[mezcla.tipoMezcla] = (inventoryMap[mezcla.tipoMezcla] || 0) + mezcla.sobranteEnBodega;
            }
        });
        
        const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e3a8a', '#1e40af'];
        return Object.entries(inventoryMap)
            .sort(([, a], [, b]) => b - a)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));

    }, [data.mezclas]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <>
            <h3 className="text-lg font-semibold text-foreground mb-4">Inventario de Mezclas</h3>
            <div className="flex-grow grid grid-cols-2 gap-4 items-center">
                 <div className="h-40 w-40 mx-auto">
                    <DoughnutChart data={chartData} onSegmentClick={(label) => onWidgetClick('mixtures', label)} />
                </div>
                <div className="space-y-1 text-sm">
                    {chartData.length > 0 ? (
                        <>
                            {chartData.slice(0, 5).map(item => (
                                <button key={item.label} onClick={() => onWidgetClick('mixtures', item.label)} className="w-full flex items-center gap-2 text-left hover:bg-muted/50 p-1 rounded-md">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span className="flex-grow truncate text-muted-foreground">{item.label}</span>
                                    <span className="font-semibold">{formatNumber(item.value)}</span>
                                </button>
                            ))}
                            <div className="font-bold text-right pt-2 border-t">Total: {formatNumber(total)}</div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground col-span-2 pt-4">No hay mezclas en inventario.</div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MixtureInventoryWidget;
