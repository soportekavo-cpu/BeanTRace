import React, { useMemo } from 'react';
import { DashboardData } from '../../pages/DashboardPage';
import { PurchaseReceipt } from '../../types';
import { formatNumber } from '../../utils/formatting';

const PurchaseProjectionWidget: React.FC<{ data: DashboardData; onWidgetClick: (type: string, payload?: any) => void; }> = ({ data, onWidgetClick }) => {
    const { contracts, contractLots, purchaseReceipts, threshingOrders } = data;

    const projections = useMemo(() => {
        const relevantContracts = contracts.filter(c => !c.isServiceContract);
        const relevantContractIds = new Set(relevantContracts.map(c => c.id));
        const relevantLots = contractLots.filter(l => relevantContractIds.has(l.contractId));

        const alturaKeywords = ['prime', 'hb', 'shb', 'ep'];
        const alturaRawMaterials = ['Pergamino', 'Oro Lavado', 'Natas'];

        const naturalKeywords = ['natural', 'folgers'];
        const naturalRawMaterials = ['Cereza', 'Oro Natural'];

        const calculatePotentialGold = (receipts: PurchaseReceipt[], relevantTypes: string[]) => {
            let potentialGold = 0;
            const yieldsByType: Record<string, { totalYield: number, count: number }> = {};
            const stockByType: Record<string, number> = {};

            receipts.forEach(r => {
                if (r.status !== 'Activo') return;
                const type = r.tipo === 'Otro' ? r.customTipo || '' : r.tipo;
                if (relevantTypes.includes(type)) {
                    if (!yieldsByType[type]) {
                        yieldsByType[type] = { totalYield: 0, count: 0 };
                    }
                    yieldsByType[type].totalYield += r.rendimientoPrimera;
                    yieldsByType[type].count += 1;
                    stockByType[type] = (stockByType[type] || 0) + r.enBodega;
                }
            });

            for (const type of relevantTypes) {
                const stock = stockByType[type] || 0;
                if (stock > 0) {
                    const avgYield = yieldsByType[type] && yieldsByType[type].count > 0 ? yieldsByType[type].totalYield / yieldsByType[type].count : 0;
                    potentialGold += stock * (avgYield / 100);
                }
            }
            return potentialGold;
        };

        const getAverageYieldForPrimary = (receipts: PurchaseReceipt[], primaryType: string) => {
            const primaryReceipts = receipts.filter(r => (r.tipo === 'Otro' ? r.customTipo : r.tipo) === primaryType && r.status === 'Activo' && r.rendimientoPrimera > 0);
            if (primaryReceipts.length === 0) return 0;
            return primaryReceipts.reduce((sum, r) => sum + r.rendimientoPrimera, 0) / primaryReceipts.length;
        };

        // --- Proyección para Cafés de Altura ---
        const alturaContracts = relevantContracts.filter(c => alturaKeywords.some(k => c.coffeeType.toLowerCase().includes(k)));
        const alturaContractIds = new Set(alturaContracts.map(c => c.id));
        let necesidadAltura = relevantLots.filter(l => alturaContractIds.has(l.contractId)).reduce((sum, l) => sum + l.pesoQqs, 0);
        const ventasLocalesSHB = threshingOrders.filter(o => o.orderType === 'Venta Local').reduce((sum, o) => sum + (o.pesoVendido || 0), 0);
        necesidadAltura += ventasLocalesSHB;
        const trillasAltura = threshingOrders.filter(o => o.contractId && alturaContractIds.has(o.contractId)).reduce((sum, o) => sum + o.totalPrimeras, 0);
        necesidadAltura -= trillasAltura;
        const oroPotencialAltura = calculatePotentialGold(purchaseReceipts, alturaRawMaterials);
        const balanceAltura = oroPotencialAltura - necesidadAltura;
        const deficitOroAltura = Math.max(0, -balanceAltura);
        const sobranteOroAltura = Math.max(0, balanceAltura);
        const rendimientoPromedioPergamino = getAverageYieldForPrimary(purchaseReceipts, 'Pergamino');
        const estimacionCompraAltura = rendimientoPromedioPergamino > 0 ? deficitOroAltura / (rendimientoPromedioPergamino / 100) : 0;

        // --- Proyección para Naturales ---
        const naturalContracts = relevantContracts.filter(c => naturalKeywords.some(k => c.coffeeType.toLowerCase().includes(k)));
        const naturalContractIds = new Set(naturalContracts.map(c => c.id));
        let necesidadNaturales = relevantLots.filter(l => naturalContractIds.has(l.contractId)).reduce((sum, l) => sum + l.pesoQqs, 0);
        const trillasNaturales = threshingOrders.filter(o => o.contractId && naturalContractIds.has(o.contractId)).reduce((sum, o) => sum + o.totalPrimeras, 0);
        necesidadNaturales -= trillasNaturales;
        const oroPotencialNaturales = calculatePotentialGold(purchaseReceipts, naturalRawMaterials);
        const balanceNaturales = oroPotencialNaturales - necesidadNaturales;
        const deficitOroNaturales = Math.max(0, -balanceNaturales);
        const sobranteOroNaturales = Math.max(0, balanceNaturales);
        const rendimientoPromedioCereza = getAverageYieldForPrimary(purchaseReceipts, 'Cereza');
        const estimacionCompraNaturales = rendimientoPromedioCereza > 0 ? deficitOroNaturales / (rendimientoPromedioCereza / 100) : 0;

        return {
            altura: { necesidad: necesidadAltura, oroPotencial: oroPotencialAltura, deficit: deficitOroAltura, sobrante: sobranteOroAltura, estimacion: estimacionCompraAltura },
            naturales: { necesidad: necesidadNaturales, oroPotencial: oroPotencialNaturales, deficit: deficitOroNaturales, sobrante: sobranteOroNaturales, estimacion: estimacionCompraNaturales }
        };

    }, [contracts, contractLots, purchaseReceipts, threshingOrders]);

    const ProjectionCard: React.FC<{ title: string; data: any; color: string; primaryRawMaterial: string; }> = ({ title, data, color, primaryRawMaterial }) => {
        const hasSurplus = data.sobrante > 0.005;

        return (
            <div className="bg-muted/50 p-4 rounded-lg flex-1">
                <h4 className={`text-md font-bold text-center mb-3 text-${color}-600`}>{title}</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Necesidad (qqs. Oro)</p>
                        <p className="font-bold text-lg">{formatNumber(data.necesidad)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Oro Potencial en Bodega</p>
                        <p className="font-bold text-lg">{formatNumber(data.oroPotencial)}</p>
                    </div>

                    {hasSurplus ? (
                        <div className={`p-3 rounded-md bg-green-500/10 border border-green-500/20`}>
                            <p className="text-green-600 dark:text-green-400">Sobrante de Oro (Estimado)</p>
                            <p className="font-bold text-xl text-green-500">{formatNumber(data.sobrante)}</p>
                        </div>
                    ) : (
                         <div className={`p-3 rounded-md bg-red-500/10 border border-red-500/20`}>
                            <p className="text-red-600 dark:text-red-400">Déficit de Oro</p>
                            <p className="font-bold text-xl text-red-500">{formatNumber(data.deficit)}</p>
                        </div>
                    )}
                    
                     <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
                        <p className="text-orange-600 dark:text-orange-400">Compra Estimada ({primaryRawMaterial})</p>
                        <p className="font-bold text-xl text-orange-500">{formatNumber(data.estimacion)}</p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <>
            <h3 className="text-lg font-semibold text-foreground mb-4">Proyección de Compra (qqs.)</h3>
            <div className="flex-grow flex flex-col md:flex-row gap-6">
                <ProjectionCard title="Proyección Cafés de Altura" data={projections.altura} color="blue" primaryRawMaterial="Pergamino"/>
                <ProjectionCard title="Proyección Cafés Naturales" data={projections.naturales} color="red" primaryRawMaterial="Cereza"/>
            </div>
        </>
    );
};

export default PurchaseProjectionWidget;