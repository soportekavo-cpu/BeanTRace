import React, { useState } from 'react';
import api from '../services/localStorageManager';
// FIX: Import 'MezclaVignetteInput' to resolve TypeScript error.
import { Contract, ContractLot, ThreshingOrder, ThreshingOrderReceipt, PurchaseReceipt, Viñeta, Mezcla, Salida, Rendimiento, Reproceso, MezclaVignetteInput } from '../types';
import SearchIcon from '../components/icons/SearchIcon';

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

interface SearchResult {
    type: 'partida' | 'contrato' | 'ordenTrilla' | 'recibo' | 'viñeta' | 'mezcla' | 'salida' | 'rendimiento' | 'reproceso';
    data: any;
    origin?: any;
    destinations?: any[];
}

const ResultCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode; color: string }> = ({ title, children, icon, color }) => (
    <div className={`bg-card border-l-4 border-${color}-500 rounded-r-lg shadow-sm p-6`}>
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center`}>{icon}</div>
            <h3 className={`text-lg font-semibold text-${color}-600 dark:text-${color}-400`}>{title}</h3>
        </div>
        {children}
    </div>
);

const TrazabilidadPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SearchResult | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchTerm.trim();
        if (!term) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const [
                lots, contracts, threshingOrders, rendimientos, reprocesos, mezclas, salidas, recibos,
                allRendimientos, allReprocesos
            ] = await Promise.all([
                api.getCollection<ContractLot>('contractLots', l => l.partida === term),
                api.getCollection<Contract>('contracts', c => c.contractNumber === term),
                api.getCollection<ThreshingOrder>('threshingOrders', o => o.orderNumber === term),
                api.getCollection<Rendimiento>('rendimientos', r => r.rendimientoNumber === term),
                api.getCollection<Reproceso>('reprocesos', r => r.reprocesoNumber === term),
                api.getCollection<Mezcla>('mezclas', m => m.mezclaNumber === term),
                api.getCollection<Salida>('salidas', s => s.salidaNumber === term),
                api.getCollection<PurchaseReceipt>('purchaseReceipts', p => p.recibo === term),
                api.getCollection<Rendimiento>('rendimientos'),
                api.getCollection<Reproceso>('reprocesos'),
            ]);
            
            const allVignettes: (Viñeta & {originDoc: Rendimiento | Reproceso, originType: 'Rendimiento' | 'Reproceso'})[] = [
                ...allRendimientos.flatMap(r => r.vignettes.map(v => ({ ...v, originDoc: r, originType: 'Rendimiento' as 'Rendimiento' }))),
                ...allReprocesos.flatMap(r => r.outputVignettes.map(v => ({ ...v, originDoc: r, originType: 'Reproceso' as 'Reproceso' })))
            ];
            const foundVignette = allVignettes.find(v => v.numeroViñeta === term);

            if (lots.length > 0) {
                // ... logic for lot
            } else if (foundVignette) {
                const destinations: any[] = [];
                const usedInMezcla = await api.getCollection<Mezcla>('mezclas', m => m.inputVignettesData.some(iv => iv.vignetteId === foundVignette.id));
                const usedInReproceso = await api.getCollection<Reproceso>('reprocesos', r => r.inputVignettesData.some(iv => iv.vignetteId === foundVignette.id));
                const usedInThreshing = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', tor => tor.inputType === 'Viñeta' && tor.receiptId === foundVignette.id);
                
                if (usedInMezcla.length > 0) destinations.push({ type: 'Mezcla', docs: usedInMezcla });
                if (usedInReproceso.length > 0) destinations.push({ type: 'Reproceso', docs: usedInReproceso });
                if (usedInThreshing.length > 0) {
                     const orderIds = usedInThreshing.map(t => t.threshingOrderId);
                     const orders = await api.getCollection<ThreshingOrder>('threshingOrders', o => orderIds.includes(o.id));
                     destinations.push({ type: 'Orden de Trilla', docs: orders });
                }
                
                setResult({ type: 'viñeta', data: foundVignette, origin: foundVignette.originDoc, destinations });
            } else if (recibos.length > 0) {
                const destinations: any[] = [];
                const usedInThreshing = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', tor => tor.inputType === 'Recibo' && tor.receiptId === recibos[0].id);
                if (usedInThreshing.length > 0) {
                     const orderIds = usedInThreshing.map(t => t.threshingOrderId);
                     const orders = await api.getCollection<ThreshingOrder>('threshingOrders', o => orderIds.includes(o.id));
                     destinations.push({ type: 'Orden de Trilla', docs: orders });
                }
                setResult({ type: 'recibo', data: recibos[0], destinations });
            } else if (mezclas.length > 0) {
                const destinations: any[] = [];
                const usedInThreshing = await api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts', tor => tor.inputType === 'Mezcla' && tor.receiptId === mezclas[0].id);
                if (usedInThreshing.length > 0) {
                     const orderIds = usedInThreshing.map(t => t.threshingOrderId);
                     const orders = await api.getCollection<ThreshingOrder>('threshingOrders', o => orderIds.includes(o.id));
                     destinations.push({ type: 'Orden de Trilla', docs: orders });
                }
                const usedInSalida = await api.getCollection<Salida>('salidas', s => s.mezclas?.some(m => m.mezclaId === mezclas[0].id));
                if (usedInSalida.length > 0) destinations.push({ type: 'Salida', docs: usedInSalida });

                setResult({ type: 'mezcla', data: mezclas[0], destinations });
            }
            // ... Add logic for other types here
            else {
                setError(`No se encontró ningún registro con el identificador "${term}".`);
            }

        } catch (err) {
            console.error(err);
            setError('Ocurrió un error al buscar la información.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-foreground">Trazabilidad Universal</h2>
                <p className="text-muted-foreground mt-1">Busca cualquier identificador (Partida, Viñeta, Recibo, Mezcla, etc.) para ver su historial completo.</p>
                <form onSubmit={handleSearch} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Ej: 11/988/1, C-123, Mezcla-1, V-45..."
                        className="flex-grow px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                        <SearchIcon className="w-4 h-4" />
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                </form>
            </div>

            {error && <div className="p-4 text-center text-red-700 bg-red-100 rounded-lg">{error}</div>}
            
            {result && (
                <div className="space-y-6">
                    {result.type === 'viñeta' && (
                        <>
                            <ResultCard title={`Viñeta: ${result.data.numeroViñeta}`} color="red" icon={<span>V</span>}>
                                <p><strong>Tipo:</strong> {result.data.tipo}</p>
                                <p><strong>Peso Actual:</strong> {result.data.pesoNeto.toFixed(2)} qqs.</p>
                                <p><strong>Estado:</strong> {result.data.status}</p>
                            </ResultCard>
                            {result.origin && <ResultCard title="Origen" color="blue" icon={<span>&#8592;</span>}>
                                <p><strong>Proviene de {result.data.originType}:</strong> {result.origin.rendimientoNumber || result.origin.reprocesoNumber}</p>
                                <p><strong>Fecha de Creación:</strong> {formatDate(result.origin.creationDate)}</p>
                            </ResultCard>}
                             {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-2">
                                    {result.destinations.map((dest: any) => dest.docs.map((doc: any) => (
                                        <li key={doc.id}>Utilizada en <strong>{dest.type}</strong>: {doc.mezclaNumber || doc.reprocesoNumber || doc.orderNumber}</li>
                                    )))}
                                </ul>
                            </ResultCard>}
                        </>
                    )}
                     {result.type === 'recibo' && (
                        <>
                            <ResultCard title={`Recibo: ${result.data.recibo}`} color="green" icon={<span>R</span>}>
                                <p><strong>Tipo:</strong> {result.data.tipo}</p>
                                <p><strong>Peso Neto Original:</strong> {result.data.pesoNeto.toFixed(2)} qqs.</p>
                                <p><strong>En Bodega:</strong> {result.data.enBodega.toFixed(2)} qqs.</p>
                            </ResultCard>
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-2">
                                    {result.destinations.map((dest: any) => dest.docs.map((doc: any) => (
                                        <li key={doc.id}>Utilizado en <strong>{dest.type}</strong>: {doc.orderNumber}</li>
                                    )))}
                                </ul>
                            </ResultCard>}
                        </>
                    )}
                      {result.type === 'mezcla' && (
                        <>
                            <ResultCard title={`Mezcla: ${result.data.mezclaNumber}`} color="purple" icon={<span>M</span>}>
                                <p><strong>Tipo:</strong> {result.data.tipoMezcla}</p>
                                <p><strong>Total Entrada:</strong> {result.data.totalInputWeight.toFixed(2)} qqs.</p>
                                <p><strong>En Bodega:</strong> {result.data.sobranteEnBodega.toFixed(2)} qqs.</p>
                            </ResultCard>
                            <ResultCard title="Origen (Viñetas Utilizadas)" color="blue" icon={<span>&#8592;</span>}>
                               <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.data.inputVignettesData.map((v: MezclaVignetteInput) => (
                                        <li key={v.vignetteId}><strong>{v.vignetteNumber}</strong> ({v.pesoUtilizado.toFixed(2)} qqs.)</li>
                                    ))}
                               </ul>
                            </ResultCard>
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-2">
                                    {result.destinations.map((dest: any) => dest.docs.map((doc: any) => (
                                        <li key={doc.id}>Utilizada en <strong>{dest.type}</strong>: {doc.orderNumber || doc.salidaNumber}</li>
                                    )))}
                                </ul>
                            </ResultCard>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrazabilidadPage;