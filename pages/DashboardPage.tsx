import React from 'react';
import TrendingUpIcon from '../components/icons/TrendingUpIcon';
import TrendingDownIcon from '../components/icons/TrendingDownIcon';

const KpiCard: React.FC<{ title: string; value: string; change: string; changeType: 'increase' | 'decrease', description: string }> = ({ title, value, change, changeType, description }) => {
    const isIncrease = changeType === 'increase';
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className={`flex items-center text-xs font-semibold ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
                    {isIncrease ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                    {change}
                </div>
            </div>
            <p className="text-3xl font-bold mt-2">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Ingresos Totales"
                    value="$1,250.00"
                    change="+12.5%"
                    changeType="increase"
                    description="Tendencia este mes"
                />
                <KpiCard
                    title="Nuevos Contratos"
                    value="12"
                    change="-20%"
                    changeType="decrease"
                    description="Menos que el periodo anterior"
                />
                <KpiCard
                    title="Contratos Activos"
                    value="45"
                    change="+2"
                    changeType="increase"
                    description="Fuerte retención de clientes"
                />
                <KpiCard
                    title="Tasa de Crecimiento"
                    value="4.5%"
                    change="+0.5%"
                    changeType="increase"
                    description="Cumple con las proyecciones"
                />
            </div>

            {/* Chart Placeholder */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Visitantes Totales (Ejemplo)</h3>
                <div className="h-80 bg-muted/50 rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground">Gráfico de Actividad irá aquí</p>
                </div>
            </div>
            
            {/* Table Placeholder */}
             <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Resumen de Documentos (Ejemplo)</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-muted">
                            <tr>
                                <th scope="col" className="px-6 py-3">Encabezado</th>
                                <th scope="col" className="px-6 py-3">Tipo</th>
                                <th scope="col" className="px-6 py-3">Estado</th>
                                <th scope="col" className="px-6 py-3">Revisor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium text-foreground">Página de Portada</td>
                                <td className="px-6 py-4">Portada</td>
                                <td className="px-6 py-4 text-yellow-500">En Proceso</td>
                                <td className="px-6 py-4">Eddie Lake</td>
                            </tr>
                            <tr className="border-b border-border hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium text-foreground">Tabla de Contenidos</td>
                                <td className="px-6 py-4">Tabla</td>
                                <td className="px-6 py-4 text-green-500">Hecho</td>
                                <td className="px-6 py-4">Eddie Lake</td>
                            </tr>
                             <tr className="border-b border-border hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium text-foreground">Resumen Ejecutivo</td>
                                <td className="px-6 py-4">Narrativa</td>
                                <td className="px-6 py-4 text-green-500">Hecho</td>
                                <td className="px-6 py-4">Jamik Tashpulatov</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;