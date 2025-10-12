import React, { useState, useMemo } from 'react';
import { DashboardData } from '../../pages/DashboardPage';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

type ActivityTab = 'ingresos' | 'mezclas' | 'salidas';

const RecentActivityWidget: React.FC<{ data: DashboardData; onWidgetClick: (type: string, payload?: any) => void; }> = ({ data, onWidgetClick }) => {
    const { purchaseReceipts, mezclas, salidas } = data;
    const [activeTab, setActiveTab] = useState<ActivityTab>('ingresos');
    
    const recentData = useMemo(() => ({
        ingresos: purchaseReceipts.slice().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5),
        mezclas: mezclas.slice().sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()).slice(0, 5),
        salidas: salidas.slice().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5),
    }), [purchaseReceipts, mezclas, salidas]);

    const renderContent = () => {
        switch (activeTab) {
            case 'ingresos':
                return (
                    <ul className="space-y-1 text-sm">
                        {recentData.ingresos.map(r => (
                            <li key={r.id}>
                                <button onClick={() => onWidgetClick('activity', { type: 'ingreso', item: r })} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-muted/50 text-left">
                                    <span className="font-semibold text-green-600">{r.recibo}</span>
                                    <span className="text-muted-foreground truncate px-2">{r.tipo}</span>
                                    <span className="font-medium">{r.pesoNeto.toFixed(2)} qqs.</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                );
            case 'mezclas':
                return (
                     <ul className="space-y-1 text-sm">
                        {recentData.mezclas.map(m => (
                            <li key={m.id}>
                                <button onClick={() => onWidgetClick('activity', { type: 'mezcla', item: m })} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-muted/50 text-left">
                                    <span className="font-semibold text-purple-600">{m.mezclaNumber}</span>
                                    <span className="text-muted-foreground truncate px-2">{m.tipoMezcla}</span>
                                    <span className="font-medium">{m.totalInputWeight.toFixed(2)} qqs.</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                );
            case 'salidas':
                return (
                     <ul className="space-y-1 text-sm">
                        {recentData.salidas.map(s => (
                             <li key={s.id}>
                                <button onClick={() => onWidgetClick('activity', { type: 'salida', item: s })} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-muted/50 text-left">
                                    <span className="font-semibold text-blue-600">{s.salidaNumber}</span>
                                    <span className="text-muted-foreground truncate px-2">{s.clienteName}</span>
                                    <span className="font-medium">{s.pesoNeto.toFixed(2)} qqs.</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                );
            default: return null;
        }
    }
    
    return (
        <>
            <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
            <div className="border-b border-border mt-2 mb-4">
                <nav className="flex space-x-2 -mb-px">
                    {(['ingresos', 'mezclas', 'salidas'] as ActivityTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                                activeTab === tab
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-grow">
                {renderContent()}
            </div>
        </>
    );
};

export default RecentActivityWidget;