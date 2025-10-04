import React, { useState } from 'react';
import ExportersPage from '../components/ExportersPage';
import BuyersPage from '../components/BuyersPage';
import SuppliersPage from '../components/SuppliersPage';
import ClientsPage from '../components/ClientsPage';

type EntityTab = 'exporters' | 'buyers' | 'suppliers' | 'clients';

const EntitiesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<EntityTab>('exporters');

    const TabButton: React.FC<{ tab: EntityTab; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground">Gestión de Entidades</h2>
                <p className="text-muted-foreground mt-1">Administra todas las empresas y personas con las que interactúas.</p>
            </div>
            <div className="border-b border-border px-6">
                <nav className="flex space-x-4 -mb-px">
                    <TabButton tab="exporters" label="Exportadora" />
                    <TabButton tab="buyers" label="Compradores" />
                    <TabButton tab="suppliers" label="Proveedores" />
                    <TabButton tab="clients" label="Clientes" />
                </nav>
            </div>
            <div className="p-6">
                {activeTab === 'exporters' && <ExportersPage />}
                {activeTab === 'buyers' && <BuyersPage />}
                {activeTab === 'suppliers' && <SuppliersPage />}
                {activeTab === 'clients' && <ClientsPage />}
            </div>
        </div>
    );
};

export default EntitiesPage;