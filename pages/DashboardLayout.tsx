import React, { useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
// FIX: Changed import from 'firebase/auth' to '@firebase/auth' to resolve module export errors.
import { signOut } from '@firebase/auth';
import { auth } from '../services/firebase';

import SunIcon from '../components/icons/SunIcon';
import MoonIcon from '../components/icons/MoonIcon';
import HomeIcon from '../components/icons/HomeIcon';
import FileTextIcon from '../components/icons/FileTextIcon';
import BriefcaseIcon from '../components/icons/BriefcaseIcon';
import SettingsIcon from '../components/icons/SettingsIcon';

import ContractsPage from './ContractsPage';
import AdminPage from './AdminPage';
import CreateContractPage from './CreateContractPage';
import EntitiesPage from './EntitiesPage';

type Page = 'dashboard' | 'contracts' | 'entities' | 'admin' | 'create-contract';

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState<Page>('contracts');

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const NavLink: React.FC<{ page: Page; label: string; icon: ReactNode }> = ({ page, label, icon }) => (
    <button
      onClick={() => setActivePage(page)}
      className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
        activePage === page
          ? 'bg-green-600 text-white'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );

  const renderPage = (): ReactNode => {
    switch (activePage) {
      case 'contracts':
        return <ContractsPage onCreateContractClick={() => setActivePage('create-contract')} />;
      case 'entities':
        return <EntitiesPage />;
      case 'admin':
        return <AdminPage />;
      case 'create-contract':
        return <CreateContractPage onCancel={() => setActivePage('contracts')} onSaveSuccess={() => setActivePage('contracts')} />;
      default:
        return <ContractsPage onCreateContractClick={() => setActivePage('create-contract')} />;
    }
  };

  return (
    <div className="flex h-screen bg-secondary/50 text-foreground">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 border-r border-border bg-background">
        <div className="flex items-center h-16 px-6 border-b border-border">
          <h1 className="text-lg font-bold text-green-600">BeanTrace</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLink page="dashboard" label="Panel de Control" icon={<HomeIcon className="w-5 h-5" />} />
          <NavLink page="contracts" label="Contratos" icon={<FileTextIcon className="w-5 h-5" />} />
          <NavLink page="entities" label="Entidades" icon={<BriefcaseIcon className="w-5 h-5" />} />
          <NavLink page="admin" label="Administración" icon={<SettingsIcon className="w-5 h-5" />} />
        </nav>
        <div className="p-4 mt-auto border-t border-border">
            <button 
              onClick={handleSignOut}
              className="w-full px-3 py-1.5 text-sm font-medium text-center text-muted-foreground hover:text-foreground"
            >
              Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-end h-16 px-6 bg-background border-b border-border">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-muted">
              {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;