import React, { useMemo } from 'react';
import { DashboardData } from '../../pages/DashboardPage';
import DoughnutChart from '../charts/DoughnutChart';
import { formatNumber } from '../../utils/formatting';

const PrimerasInventoryWidget: React.FC<{ data: DashboardData; onWidgetClick: (type: string, payload?: any) => void; }> = ({ data, onWidgetClick }) => {
    
    const chartData = useMemo(() => {
        const inventoryMap: Record<string, number> = {
            'L. Primeras': 0,
            'N. Primeras': 0
        };
        
        data.vignettes.forEach(vignette => {
            const isInStock = (vignette.status === 'En Bodega' || vignette.status === 'Mezclada Parcialmente') && vignette.pesoNeto > 0.005;
            if (isInStock) {
                if (vignette.tipo === 'L. Primeras') {
                     inventoryMap['L. Primeras'] += vignette.pesoNeto;
                } else if (vignette.tipo === 'N. Primeras') {
                     inventoryMap['N. Primeras'] += vignette.pesoNeto;
                }
            }
        });
        
        const colors = ['#facc15', '#fbbf24'];
        return Object.entries(inventoryMap)
            .filter(([, value]) => value > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));

    }, [data.vignettes]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <>
            <h3 className="text-lg font-semibold text-foreground mb-4">Inventario de Primeras (Oro)</h3>
            <div className="flex-grow grid grid-cols-2 gap-4 items-center">
                <div className="h-40 w-40 mx-auto">
                    <DoughnutChart data={chartData} onSegmentClick={(label) => onWidgetClick('primeras', label)} />
                </div>
                <div className="space-y-1 text-sm">
                    {chartData.slice(0, 5).map(item => (
                        <button key={item.label} onClick={() => onWidgetClick('primeras', item.label)} className="w-full flex items-center gap-2 text-left hover:bg-muted/50 p-1 rounded-md">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="flex-grow truncate text-muted-foreground">{item.label}</span>
                            <span className="font-semibold">{formatNumber(item.value)}</span>
                        </button>
                    ))}
                     <div className="font-bold text-right pt-2 border-t">Total: {formatNumber(total)}</div>
                </div>
            </div>
        </>
    );
};

export default PrimerasInventoryWidget;