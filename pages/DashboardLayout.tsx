import React, { useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SunIcon from '../components/icons/SunIcon';
import MoonIcon from '../components/icons/MoonIcon';
import HomeIcon from '../components/icons/HomeIcon';
import FileTextIcon from '../components/icons/FileTextIcon';
import BriefcaseIcon from '../components/icons/BriefcaseIcon';
import SettingsIcon from '../components/icons/SettingsIcon';
import ReceiptIcon from '../components/icons/ReceiptIcon';
import BarChartIcon from '../components/icons/BarChartIcon';
import PackageIcon from '../components/icons/PackageIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import MixIcon from '../components/icons/MixIcon';
import TruckIcon from '../components/icons/TruckIcon';
import SearchIcon from '../components/icons/SearchIcon';
import ClipboardListIcon from '../components/icons/ClipboardListIcon';

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

type Page = 'dashboard' | 'contracts' | 'ventasLocales' | 'ingreso' | 'rendimientos' | 'mezclas' | 'salidas' | 'trazabilidad' | 'entities' | 'admin';

const allPages: { [key in Page]: React.FC<any> } = {
    'dashboard': DashboardPage,
    'contracts': ContractsPage,
    'ventasLocales': VentasLocalesPage,
    'ingreso': IngresoPage,
    'rendimientos': RendimientosPage,
    'mezclas': MezclasPage,
    'salidas': SalidasPage,
    'trazabilidad': TrazabilidadPage,
    'entities': EntitiesPage,
    'admin': AdminPage,
};

const DashboardLayout: React.FC = () => {
    const { user, logout, roleDetails } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activePage, setActivePage] = useState<Page>('dashboard');
    const [view, setView] = useState<'list' | 'createContract'>('list');
    const [harvestYearForCreation, setHarvestYearForCreation] = useState<string>(getCurrentHarvestYear());
    const [isSalesOpen, setIsSalesOpen] = useState(true);

    const handleCreateContractClick = (harvestYear: string) => {
        setActivePage('contracts');
        setView('createContract');
        setHarvestYearForCreation(harvestYear);
    };

    const handleSaveContractSuccess = () => {
        setView('list');
    };
    
    const handleCancelCreateContract = () => {
        setView('list');
    };

    const NavLink: React.FC<{ pageId: Page; label: string; children: ReactNode; isSubItem?: boolean }> = ({ pageId, label, children, isSubItem = false }) => {
        const isActive = activePage === pageId;
        const hasPermission = roleDetails?.permissions[pageId]?.view ?? false;

        if (!hasPermission) return null;

        return (
            <button
                onClick={() => {
                    setActivePage(pageId);
                    if (pageId === 'contracts') setView('list');
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

    const ActivePageComponent = () => {
        if (activePage === 'contracts' && view === 'createContract') {
            return <CreateContractPage onCancel={handleCancelCreateContract} onSaveSuccess={handleSaveContractSuccess} harvestYear={harvestYearForCreation} />;
        }
        
        const PageComponent = allPages[activePage];
        
        if (PageComponent) {
            if (activePage === 'contracts') {
                return <ContractsPage onCreateContractClick={handleCreateContractClick} />;
            }
            return <PageComponent />;
        }
        return <DashboardPage />;
    };
    
    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="w-64 flex flex-col border-r border-border bg-card">
                <div className="flex items-center justify-center h-16 border-b border-border flex-shrink-0">
                    <h1 className="text-xl font-bold text-green-600">BeanTrace</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavLink pageId="dashboard" label="Dashboard"><HomeIcon className="w-5 h-5" /></NavLink>
                    
                    {(roleDetails?.permissions.contracts?.view || roleDetails?.permissions.ventasLocales?.view) && (
                        <div>
                            <button
                                onClick={() => setIsSalesOpen(!isSalesOpen)}
                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            >
                                <div className="flex items-center">
                                    <PackageIcon className="w-5 h-5" />
                                    <span className="ml-3">Ventas</span>
                                </div>
                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSalesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSalesOpen && (
                                <div className="pl-4 mt-1 space-y-1">
                                    <NavLink pageId="contracts" label="Exportación" isSubItem><FileTextIcon className="w-5 h-5" /></NavLink>
                                    <NavLink pageId="ventasLocales" label="Venta Local" isSubItem><ClipboardListIcon className="w-5 h-5" /></NavLink>
                                </div>
                            )}
                        </div>
                    )}

                    <NavLink pageId="ingreso" label="Ingreso de Café"><ReceiptIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="rendimientos" label="Rendimientos"><BarChartIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="mezclas" label="Mezclas"><MixIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="salidas" label="Salidas"><TruckIcon className="w-5 h-5" /></NavLink>
                    <NavLink pageId="trazabilidad" label="Trazabilidad"><SearchIcon className="w-5 h-5" /></NavLink>
                    
                    <div className="pt-4 mt-2 border-t">
                        <NavLink pageId="entities" label="Entidades"><BriefcaseIcon className="w-5 h-5" /></NavLink>
                        <NavLink pageId="admin" label="Administración"><SettingsIcon className="w-5 h-5" /></NavLink>
                    </div>
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-border">
                    <div>
                        {/* Can be used for breadcrumbs or page title */}
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted">
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                        <div className="text-right">
                            <p className="font-semibold text-sm">{user?.email}</p>
                            <p className="text-xs text-muted-foreground">{roleDetails?.name}</p>
                        </div>
                        <button onClick={logout} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                            Salir
                        </button>
                    </div>
                </header>
                {/* Page content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <ActivePageComponent />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;