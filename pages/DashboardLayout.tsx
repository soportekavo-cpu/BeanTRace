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
import DollarSignIcon from '../components/icons/DollarSignIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import MixIcon from '../components/icons/MixIcon';
import TruckIcon from '../components/icons/TruckIcon';
import SearchIcon from '../components/icons/SearchIcon';

// FIX: File 'file:///pages/DashboardPage.tsx' is not a module.
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
    const [isSalesOpen, setIsSalesOpen] = useState(false);

    const handleCreateContractClick = () => {
        setActivePage('contracts');
        setView('createContract');
    };

    const handleSaveContractSuccess = () => {
        setView('list');
    };
    
    const handleCancelCreateContract = () => {
        setView('list');
    };

    const NavLink: React.FC<{ pageId: Page; label: string; children: ReactNode; isSubItem?: boolean }> = ({ pageId, label, children, isSubItem = false }) => {
        const isActive = activePage === pageId;
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
            return <CreateContractPage onCancel={handleCancelCreateContract} onSaveSuccess={handleSaveContractSuccess} />;
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
            <aside className="w-64 flex-shrink-0 border-r border-border flex flex-col">
                <div className="h-16 flex items-center justify-center border-b border-border">
                    <h1 className="text-xl font-bold text-green-600">BeanTrace</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {roleDetails?.permissions.dashboard?.view && (
                        <NavLink pageId="dashboard" label="Dashboard">
                            <HomeIcon className="w-5 h-5" />
                        </NavLink>
                    )}

                    {(roleDetails?.permissions.contracts?.view || roleDetails?.permissions.ventasLocales?.view) && (
                        <div className="space-y-1">
                            <button
                                onClick={() => setIsSalesOpen(!isSalesOpen)}
                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            >
                                <div className="flex items-center">
                                    <PackageIcon className="w-5 h-5" />
                                    <span className="ml-3">Ventas</span>
                                </div>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isSalesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSalesOpen && (
                                <div className="pt-1 space-y-1">
                                    {roleDetails?.permissions.contracts?.view && (
                                        <NavLink pageId="contracts" label="Exportaciones" isSubItem>
                                            <FileTextIcon className="w-4 h-4" />
                                        </NavLink>
                                    )}
                                    {roleDetails?.permissions.ventasLocales?.view && (
                                        <NavLink pageId="ventasLocales" label="Ventas Locales" isSubItem>
                                            <PackageIcon className="w-4 h-4" />
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {roleDetails?.permissions.ingreso?.view && (
                        <NavLink pageId="ingreso" label="Ingreso Café">
                            <ReceiptIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                    {roleDetails?.permissions.rendimientos?.view && (
                         <NavLink pageId="rendimientos" label="Rendimientos">
                            <BarChartIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                     {roleDetails?.permissions.mezclas?.view && (
                         <NavLink pageId="mezclas" label="Mezclas">
                            <MixIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                    {roleDetails?.permissions.salidas?.view && (
                         <NavLink pageId="salidas" label="Salidas">
                            <TruckIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                     {roleDetails?.permissions.trazabilidad?.view && (
                         <NavLink pageId="trazabilidad" label="Trazabilidad">
                            <SearchIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                    {roleDetails?.permissions.entities?.view && (
                         <NavLink pageId="entities" label="Entidades">
                            <BriefcaseIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                    {roleDetails?.permissions.admin?.view && (
                        <NavLink pageId="admin" label="Administración">
                            <SettingsIcon className="w-5 h-5" />
                        </NavLink>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 flex items-center justify-between px-6 border-b border-border flex-shrink-0">
                    <div></div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                        <div className="text-sm">
                            <div className="font-medium">{user?.email}</div>
                            <div className="text-xs text-muted-foreground">{roleDetails?.name}</div>
                        </div>
                        <button onClick={logout} className="text-sm font-medium text-red-500 hover:underline">
                            Salir
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <ActivePageComponent />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;