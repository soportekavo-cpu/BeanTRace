

import React, { useState, ReactNode, useEffect, useCallback } from 'react';
import api from '../services/localStorageManager';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SunIcon from '../components/icons/SunIcon';
import MoonIcon from '../components/icons/MoonIcon';
import HomeIcon from '../components/icons/HomeIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PackageIcon from '../components/icons/PackageIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import TruckIcon from '../components/icons/TruckIcon';
import SearchIcon from '../components/icons/SearchIcon';
import MenuIcon from '../components/icons/MenuIcon';
import XIcon from '../components/icons/XIcon';
import ForkliftIcon from '../components/icons/ForkliftIcon';
import ShipIcon from '../components/icons/ShipIcon';
import StoreIcon from '../components/icons/StoreIcon';
import ArrowDownToLineIcon from '../components/icons/ArrowDownToLineIcon';
import FlaskConicalIcon from '../components/icons/FlaskConicalIcon';
import LogOutIcon from '../components/icons/LogOutIcon';
import DashboardPage from './DashboardPage';
import ContractsPage from './ContractsPage';
import CreateContractPage from './CreateContractPage';
import AdminPage from './AdminPage';
import EntitiesPage from './EntitiesPage';
import IngresoPage from './IngresoPage';
import RendimientosPage from './RendimientosPage';
import VentasLocalesPage from './VentasLocalesPage';
import MezclasPage from './MezclasPage';
import SalidasPage from './SalidasPage';
import TrazabilidadPage from './TrazabilidadPage';
import { getCurrentHarvestYear } from '../utils/harvestYear';
import GlobalSearchModal from '../components/GlobalSearchModal';
import { useHighlight } from '../contexts/HighlightContext';

export type Page = 'dashboard' | 'contracts' | 'ventasLocales' | 'ingreso' | 'rendimientos' | 'mezclas' | 'salidas' | 'trazabilidad' | 'entities' | 'admin';

const PageComponent: React.FC<{ page: Page }> = ({ page }) => {
    switch (page) {
        case 'dashboard': return <DashboardPage />;
        case 'contracts': return <ContractsPage onCreateContractClick={() => {}} />;
        case 'ventasLocales': return <VentasLocalesPage />;
        case 'ingreso': return <IngresoPage />;
        case 'rendimientos': return <RendimientosPage />;
        case 'mezclas': return <MezclasPage />;
        case 'salidas': return <SalidasPage />;
        case 'trazabilidad': return <TrazabilidadPage />;
        case 'entities': return <EntitiesPage />;
        case 'admin': return <AdminPage />;
        default: return <DashboardPage />;
    }
};

const DashboardLayout: React.FC = () => {
    const { user, logout, roleDetails } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activePage, setActivePage] = useState<Page>('dashboard');
    const [pageKey, setPageKey] = useState(0); // Key to force re-render
    const [view, setView] = useState<'list' | 'createContract'>('list');
    const [harvestYearForCreation, setHarvestYearForCreation] = useState<string>(getCurrentHarvestYear());
    const [isSalesOpen, setIsSalesOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchData, setSearchData] = useState<any>(null);
    const [isSearchDataLoading, setIsSearchDataLoading] = useState(false);
    const { setHighlight } = useHighlight();

    const fetchSearchData = useCallback(async () => {
        setIsSearchDataLoading(true);
        try {
            const [contracts, contractLots, purchaseReceipts, threshingOrders, rendimientos, reprocesos, mezclas, salidas] = await Promise.all([
                api.getCollection('contracts'),
                api.getCollection('contractLots'),
                api.getCollection('purchaseReceipts'),
                api.getCollection('threshingOrders'),
                api.getCollection('rendimientos'),
                api.getCollection('reprocesos'),
                api.getCollection('mezclas'),
                api.getCollection('salidas'),
            ]);
            const rendVignettes = rendimientos.flatMap((r: any) => r.vignettes);
            const reproVignettes = reprocesos.flatMap((r: any) => r.outputVignettes);

            setSearchData({
                contracts, contractLots, purchaseReceipts, threshingOrders,
                rendimientos, reprocesos, mezclas, salidas,
                vignettes: [...rendVignettes, ...reproVignettes]
            });
        } catch (error) {
            console.error("Failed to fetch data for global search:", error);
        } finally {
            setIsSearchDataLoading(false);
        }
    }, []);

    const handleOpenSearch = () => {
        fetchSearchData();
        setIsSearchOpen(true);
    };

    const handleSearchResultClick = (page: Page, targetId: string, parentId?: string, tab?: string) => {
        setActivePage(page);
        setHighlight({ targetId, parentId, tab });
        setIsSearchOpen(false);
    };
    
    const handleCreateContractClick = (harvestYear: string) => {
        setActivePage('contracts');
        setView('createContract');
        setIsSidebarOpen(false);
    };

    const handleSaveContractSuccess = () => {
        setView('list');
    };
    
    const handleCancelCreateContract = () => {
        setView('list');
    };

    const NavLink: React.FC<{ pageId: Page; label: string; children: ReactNode; isSubItem?: boolean }> = ({ pageId, label, children, isSubItem = false }) => {
        const isActive = activePage === pageId;
        
        let hasPermission = roleDetails?.permissions[pageId]?.view ?? false;

        if (pageId === 'contracts') {
            hasPermission = roleDetails?.permissions['contracts-info']?.view || 
                            roleDetails?.permissions['contracts-lots']?.view || 
                            roleDetails?.permissions['contracts-threshing']?.view;
        }

        if (!hasPermission) return null;

        return (
            <button
                onClick={() => {
                    if (activePage === pageId) {
                        setPageKey(prev => prev + 1); // Force re-render
                    } else {
                        setActivePage(pageId);
                    }
                    if (pageId === 'contracts') setView('list');
                    setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isSubItem ? 'pl-10' : ''
                } ${
                    isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
            >
                {children}
                <span className="ml-3">{label}</span>
            </button>
        );
    };

    const canViewContracts = roleDetails?.permissions['contracts-info']?.view || 
                             roleDetails?.permissions['contracts-lots']?.view || 
                             roleDetails?.permissions['contracts-threshing']?.view;
    const canViewVentasLocales = roleDetails?.permissions['ventasLocales']?.view;
    const canViewVentas = canViewContracts || canViewVentasLocales;
    
    const renderActivePage = () => {
        if (activePage === 'contracts') {
            if (view === 'createContract') {
                return <CreateContractPage key={pageKey} onCancel={handleCancelCreateContract} onSaveSuccess={handleSaveContractSuccess} harvestYear={harvestYearForCreation} />;
            } else {
                return <ContractsPage key={pageKey} onCreateContractClick={handleCreateContractClick} />;
            }
        }
        return <PageComponent page={activePage} key={pageKey} />;
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
             {/* Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden" 
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <div className="flex items-center justify-between h-16 px-6 border-b border-border flex-shrink-0">
                    <h1 className="flex items-baseline">
                        <span className="text-2xl font-bold text-green-600">BeanTrace</span>
                        <span className="ml-2 text-xs italic text-muted-foreground">by KAVO</span>
                    </h1>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 -mr-2 rounded-md hover:bg-muted">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    <NavLink pageId="dashboard" label="Dashboard"><HomeIcon className="w-5 h-5" /></NavLink>
                    
                    {canViewVentas && (
                        <div className="relative">
                            <button
                                onClick={() => setIsSalesOpen(!isSalesOpen)}
                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            >
                                <div className="flex items-center">
                                    <ForkliftIcon className="w-5 h-5" />
                                    <span className="ml-3">Ventas</span>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSalesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSalesOpen && (
                                <div className="mt-1 space-y-1">
                                    <NavLink pageId="contracts" label="Exportación" isSubItem><ShipIcon className="w-5 h-5" /></NavLink>
                                    <NavLink pageId="ventasLocales" label="Venta Local" isSubItem><StoreIcon className="w-5 h-5" /></NavLink>
                                </div>
                            )}
                        </div>
                    )}

                    <NavLink pageId="ingreso" label="Ingreso de Café"><ArrowDownToLineIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="rendimientos" label="Rendimientos"><BarChartIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="mezclas" label="Mezclas"><FlaskConicalIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="salidas" label="Salidas"><TruckIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="trazabilidad" label="Trazabilidad IA"><SearchIcon className="w-5 h-5" /></NavLink>

                    <div className="pt-4 mt-4 border-t border-border space-y-2">
                        <NavLink pageId="entities" label="Entidades"><PackageIcon className="w-5 h-5" /></NavLink>
                        <NavLink pageId="admin" label="Administración"><SettingsIcon className="w-5 h-5" /></NavLink>
                    </div>
                </nav>
                 <div className="p-4 border-t border-border flex-shrink-0 space-y-3">
                    <div className="text-sm text-left">
                        <p className="font-semibold truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <button 
                        onClick={logout} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                    >
                        <LogOutIcon className="w-4 h-4"/>
                        Salir
                    </button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col lg:ml-64">
                <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-20">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1 -ml-2 rounded-md hover:bg-muted">
                        <MenuIcon className="w-6 h-6"/>
                    </button>
                     <div className="flex-1"></div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleOpenSearch} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                            <SearchIcon className="w-5 h-5" />
                        </button>
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {renderActivePage()}
                </main>
            </div>
            {isSearchOpen && (
                <GlobalSearchModal
                    isOpen={isSearchOpen}
                    onClose={() => setIsSearchOpen(false)}
                    data={searchData}
                    isLoading={isSearchDataLoading}
                    onResultClick={handleSearchResultClick}
                />
            )}
        </div>
    );
};

export default DashboardLayout;