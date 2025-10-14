
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/localStorageManager';
import { Contract, ContractLot, PurchaseReceipt, Viñeta, Mezcla, Salida, Rendimiento, Reproceso, Supplier, ThreshingOrder } from '../types';
import AlertsWidget from '../components/widgets/AlertsWidget';
import PurchaseProjectionWidget from '../components/widgets/PurchaseProjectionWidget';
import RawMaterialInventoryWidget from '../components/widgets/RawMaterialInventoryWidget';
import ByproductInventoryWidget from '../components/widgets/ByproductInventoryWidget';
import MixtureInventoryWidget from '../components/widgets/MixtureInventoryWidget';
import RecentActivityWidget from '../components/widgets/RecentActivityWidget';
import CustomizeDashboardModal from '../components/CustomizeDashboardModal';
import FixationsDetailModal from '../components/widgets/details/FixationsDetailModal';
import RawMaterialDetailModal from '../components/widgets/details/RawMaterialDetailModal';
import ByproductDetailModal from '../components/widgets/details/ByproductDetailModal';
import MixtureDetailModal from '../components/widgets/details/MixtureDetailModal';
import ActivityDetailModal from '../components/widgets/details/ActivityDetailModal';
import SettingsIcon from '../components/icons/SettingsIcon';
import PrimerasInventoryWidget from '../components/widgets/PrimerasInventoryWidget';
import UpcomingShipmentsDetailModal from '../components/widgets/details/UpcomingShipmentsDetailModal';
import PrimerasDetailModal from '../components/widgets/details/PrimerasDetailModal';


export interface DashboardData {
    contracts: Contract[];
    contractLots: ContractLot[];
    purchaseReceipts: PurchaseReceipt[];
    vignettes: Viñeta[];
    mezclas: Mezcla[];
    salidas: Salida[];
    suppliers: Supplier[];
    threshingOrders: ThreshingOrder[];
}

export type WidgetKey = 'alerts' | 'projections' | 'rawMaterial' | 'primeras' | 'byproducts' | 'mixtures' | 'activity';

const allWidgets: Record<WidgetKey, { name: string; component: React.FC<any> }> = {
    alerts: { name: 'Alertas y Pendientes', component: AlertsWidget },
    projections: { name: 'Proyección de Compra', component: PurchaseProjectionWidget },
    rawMaterial: { name: 'Inventario Materia Prima', component: RawMaterialInventoryWidget },
    primeras: { name: 'Inventario de Primeras (Oro)', component: PrimerasInventoryWidget },
    byproducts: { name: 'Inventario Subproductos', component: ByproductInventoryWidget },
    mixtures: { name: 'Inventario de Mezclas', component: MixtureInventoryWidget },
    activity: { name: 'Actividad Reciente', component: RecentActivityWidget },
};

const defaultWidgets: WidgetKey[] = ['alerts', 'activity', 'rawMaterial', 'primeras', 'byproducts', 'mixtures', 'projections'];

type ModalState = {
    type: 'fixations' | 'rawMaterial' | 'byproducts' | 'primeras' | 'mixtures' | 'activity' | 'upcomingShipments' | null;
    payload?: any;
};

const DashboardPage: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [visibleWidgets, setVisibleWidgets] = useState<WidgetKey[]>(() => {
        try {
            const stored = localStorage.getItem('dashboardWidgets');
            return stored ? JSON.parse(stored) : defaultWidgets;
        } catch {
            return defaultWidgets;
        }
    });
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [modal, setModal] = useState<ModalState>({ type: null });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                rendimientos,
                reprocesos,
                contracts,
                contractLots,
                purchaseReceipts,
                mezclas,
                salidas,
                suppliers,
                threshingOrders,
            ] = await Promise.all([
                // FIX: Corrected typo 'Rendimento' to 'Rendimiento'
                api.getCollection<Rendimiento>('rendimientos'),
                api.getCollection<Reproceso>('reprocesos'),
                api.getCollection<Contract>('contracts'),
                api.getCollection<ContractLot>('contractLots'),
                api.getCollection<PurchaseReceipt>('purchaseReceipts'),
                api.getCollection<Mezcla>('mezclas'),
                api.getCollection<Salida>('salidas'),
                api.getCollection<Supplier>('suppliers'),
                api.getCollection<ThreshingOrder>('threshingOrders'),
            ]);

            const vignettesFromRendimientos = rendimientos.flatMap(r => r.vignettes);
            const vignettesFromReprocesos = reprocesos.flatMap(r => r.outputVignettes);
            const vignettes = [...vignettesFromRendimientos, ...vignettesFromReprocesos];

            setData({ contracts, contractLots, purchaseReceipts, vignettes, mezclas, salidas, suppliers, threshingOrders });
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleWidgetClick = (type: ModalState['type'], payload?: any) => {
        setModal({ type, payload });
    };
    
    const handleSaveCustomization = (widgets: WidgetKey[]) => {
        setVisibleWidgets(widgets);
        localStorage.setItem('dashboardWidgets', JSON.stringify(widgets));
        setIsCustomizeModalOpen(false);
    };

    if (loading) {
        return <div className="text-center p-12">Cargando dashboard...</div>;
    }

    if (!data) {
        return <div className="text-center p-12 text-red-500">No se pudieron cargar los datos del dashboard.</div>;
    }
    
    const renderModal = () => {
        switch (modal.type) {
            case 'fixations':
                return <FixationsDetailModal lots={modal.payload} contracts={data.contracts} onClose={() => setModal({ type: null })} />;
            case 'upcomingShipments':
                return <UpcomingShipmentsDetailModal contracts={modal.payload} onClose={() => setModal({ type: null })} />;
            case 'rawMaterial':
                return <RawMaterialDetailModal coffeeType={modal.payload} receipts={data.purchaseReceipts} suppliers={data.suppliers} onClose={() => setModal({ type: null })} />;
            case 'primeras':
                return <PrimerasDetailModal primerasType={modal.payload} vignettes={data.vignettes} onClose={() => setModal({ type: null })} />;
            case 'byproducts':
                return <ByproductDetailModal byproductType={modal.payload} vignettes={data.vignettes} onClose={() => setModal({ type: null })} />;
            case 'mixtures':
                 return <MixtureDetailModal mixtureType={modal.payload} mezclas={data.mezclas} onClose={() => setModal({ type: null })} />;
            case 'activity':
                return <ActivityDetailModal item={modal.payload.item} type={modal.payload.type} onClose={() => setModal({ type: null })} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
                <button onClick={() => setIsCustomizeModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                    <SettingsIcon className="w-4 h-4" /> Personalizar
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleWidgets.map(key => {
                    const WidgetComponent = allWidgets[key].component;
                    let colSpanClass = 'lg:col-span-1';
                    if (key === 'activity' || key === 'alerts') colSpanClass = 'lg:col-span-2';
                    if (key === 'projections') colSpanClass = 'lg:col-span-4';
                    
                    return (
                        <div key={key} className={`bg-card border border-border rounded-lg shadow-sm p-4 flex flex-col ${colSpanClass}`}>
                            <WidgetComponent data={data} onWidgetClick={handleWidgetClick} />
                        </div>
                    );
                })}
            </div>
            
            {isCustomizeModalOpen && <CustomizeDashboardModal allWidgets={allWidgets} visibleWidgets={visibleWidgets} onSave={handleSaveCustomization} onClose={() => setIsCustomizeModalOpen(false)} />}
            {renderModal()}
        </div>
    );
};

export default DashboardPage;