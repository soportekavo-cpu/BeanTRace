import React, { useState } from 'react';
import api from '../services/localStorageManager';
import { Contract, ContractLot, ThreshingOrder, ThreshingOrderReceipt, PurchaseReceipt, Viñeta, Mezcla, Salida, Rendimiento, Reproceso, MezclaVignetteInput, SalidaReciboInput, SalidaMezclaInput } from '../types';
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
            <div className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 font-bold`}>{icon}</div>
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
        const termLower = term.toLowerCase();

        try {
            const [
                lots, contracts, threshingOrders, rendimientos, reprocesos, mezclas, salidas, recibos,
                allRendimientos, allReprocesos, allThreshingOrderReceipts, allSalidas
            ] = await Promise.all([
                api.getCollection<ContractLot>('contractLots', l => l.partida.toLowerCase() === termLower),
                api.getCollection<Contract>('contracts', c => c.contractNumber.toLowerCase() === termLower),
                api.getCollection<ThreshingOrder>('threshingOrders', o => o.orderNumber.toLowerCase() === termLower),
                api.getCollection<Rendimiento>('rendimientos', r => r.rendimientoNumber.toLowerCase() === termLower),
                api.getCollection<Reproceso>('reprocesos', r => r.reprocesoNumber.toLowerCase() === termLower),
                api.getCollection<Mezcla>('mezclas', m => m.mezclaNumber.toLowerCase() === termLower),
                api.getCollection<Salida>('salidas', s => s.salidaNumber.toLowerCase() === termLower),
                api.getCollection<PurchaseReceipt>('purchaseReceipts', p => p.recibo.toLowerCase() === termLower),
                api.getCollection<Rendimiento>('rendimientos'),
                api.getCollection<Reproceso>('reprocesos'),
                api.getCollection<ThreshingOrderReceipt>('threshingOrderReceipts'),
                api.getCollection<Salida>('salidas'),
            ]);
            
            const allVignettes: (Viñeta & {originDoc: Rendimiento | Reproceso, originType: 'Rendimiento' | 'Reproceso'})[] = [
                ...allRendimientos.flatMap(r => r.vignettes.map(v => ({ ...v, originDoc: r, originType: 'Rendimiento' as 'Rendimiento' }))),
                ...allReprocesos.flatMap(r => r.outputVignettes.map(v => ({ ...v, originDoc: r, originType: 'Reproceso' as 'Reproceso' })))
            ];
            const foundVignette = allVignettes.find(v => v.numeroViñeta.toLowerCase() === termLower);

            if (lots.length > 0) {
                const lot = lots[0];
                const originContract = await api.getCollection<Contract>('contracts', c => c.id === lot.contractId).then(res => res[0]);
                const destinationOrder = await api.getCollection<ThreshingOrder>('threshingOrders', o => o.lotIds.includes(lot.id)).then(res => res[0]);
                setResult({ type: 'partida', data: lot, origin: originContract, destinations: destinationOrder ? [{ type: 'Orden de Trilla', docs: [destinationOrder] }] : [] });
            } else if (contracts.length > 0) {
                const contract = contracts[0];
                const contractLots = await api.getCollection<ContractLot>('contractLots', l => l.contractId === contract.id);
                setResult({ type: 'contrato', data: contract, destinations: [{ type: 'Partidas', docs: contractLots }] });
            } else if (threshingOrders.length > 0) {
                const order = threshingOrders[0];
                const origins = allThreshingOrderReceipts.filter(tor => tor.threshingOrderId === order.id);
                const destination = allRendimientos.find(r => r.threshingOrderIds.includes(order.id));
                setResult({ type: 'ordenTrilla', data: order, origin: origins, destinations: destination ? [{ type: 'Rendimiento', docs: [destination] }] : [] });
            } else if (rendimientos.length > 0) {
                const rendimiento = rendimientos[0];
                const originOrders = await api.getCollection<ThreshingOrder>('threshingOrders', o => rendimiento.threshingOrderIds.includes(o.id));
                const destinations = rendimiento.vignettes;
                setResult({ type: 'rendimiento', data: rendimiento, origin: originOrders, destinations: [{ type: 'Viñetas', docs: destinations }] });
            } else if (reprocesos.length > 0) {
                const reproceso = reprocesos[0];
                const origins = reproceso.inputVignettesData;
                const destinations = reproceso.outputVignettes;
                setResult({ type: 'reproceso', data: reproceso, origin: origins, destinations: [{ type: 'Viñetas de Salida', docs: destinations }] });
            } else if (salidas.length > 0) {
                 const salida = salidas[0];
                 const origins = salida.tipoSalida === 'Mezcla' ? salida.mezclas : salida.recibos;
                 setResult({ type: 'salida', data: salida, origin: origins });
            } else if (foundVignette) {
                const destinations: any[] = [];
                const usedInMezcla = mezclas.filter(m => m.inputVignettesData.some(iv => iv.vignetteId === foundVignette.id));
                // FIX: Property 'vignetteId' does not exist on type 'Viñeta'. Corrected to use 'id'.
                const usedInReproceso = reprocesos.filter(r => r.inputVignettesData.some(iv => iv.id === foundVignette.id));
                const usedInThreshing = allThreshingOrderReceipts.filter(tor => tor.inputType === 'Viñeta' && tor.receiptId === foundVignette.id);
                
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
                const usedInThreshing = allThreshingOrderReceipts.filter(tor => tor.inputType === 'Recibo' && tor.receiptId === recibos[0].id);
                if (usedInThreshing.length > 0) {
                     const orderIds = usedInThreshing.map(t => t.threshingOrderId);
                     const orders = await api.getCollection<ThreshingOrder>('threshingOrders', o => orderIds.includes(o.id));
                     destinations.push({ type: 'Orden de Trilla', docs: orders });
                }
                setResult({ type: 'recibo', data: recibos[0], destinations });
            } else if (mezclas.length > 0) {
                const destinations: any[] = [];
                const usedInThreshing = allThreshingOrderReceipts.filter(tor => tor.inputType === 'Mezcla' && tor.receiptId === mezclas[0].id);
                if (usedInThreshing.length > 0) {
                     const orderIds = usedInThreshing.map(t => t.threshingOrderId);
                     const orders = await api.getCollection<ThreshingOrder>('threshingOrders', o => orderIds.includes(o.id));
                     destinations.push({ type: 'Orden de Trilla', docs: orders });
                }
                const usedInSalida = allSalidas.filter(s => s.mezclas?.some(m => m.mezclaId === mezclas[0].id));
                if (usedInSalida.length > 0) destinations.push({ type: 'Salida', docs: usedInSalida });

                setResult({ type: 'mezcla', data: mezclas[0], destinations });
            } else {
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
                    {result.type === 'partida' && (
                        <>
                            <ResultCard title={`Partida: ${result.data.partida}`} color="cyan" icon={'P'}>
                                <p><strong>Peso:</strong> {result.data.pesoQqs.toFixed(2)} qqs.</p>
                                <p><strong>Empaque:</strong> {result.data.empaque}</p>
                            </ResultCard>
                            {result.origin && <ResultCard title="Origen" color="blue" icon={<span>&#8592;</span>}>
                                <p>Proviene del <strong>Contrato</strong>: {result.origin.contractNumber}</p>
                                <p><strong>Comprador:</strong> {result.origin.buyerName}</p>
                            </ResultCard>}
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-2">
                                    {result.destinations.map((dest: any) => dest.docs.map((doc: any) => (
                                        <li key={doc.id}>Utilizada en <strong>{dest.type}</strong>: {doc.orderNumber}</li>
                                    )))}
                                </ul>
                            </ResultCard>}
                        </>
                    )}
                    {result.type === 'contrato' && (
                        <>
                            <ResultCard title={`Contrato: ${result.data.contractNumber}`} color="cyan" icon={'C'}>
                                <p><strong>Comprador:</strong> {result.data.buyerName}</p>
                                <p><strong>Tipo Café:</strong> {result.data.coffeeType}</p>
                            </ResultCard>
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.destinations.map((dest: any) => dest.docs.map((doc: any) => (
                                        <li key={doc.id}>Generó <strong>{dest.type}</strong>: {doc.partida} ({doc.pesoQqs.toFixed(2)} qqs.)</li>
                                    )))}
                                </ul>
                            </ResultCard>}
                        </>
                    )}
                    {result.type === 'ordenTrilla' && (
                        <>
                             <ResultCard title={`Orden de Trilla: ${result.data.orderNumber}`} color="yellow" icon={'OT'}>
                                <p><strong>Tipo:</strong> {result.data.orderType}</p>
                                <p><strong>Primeras Producidas:</strong> {result.data.totalPrimeras.toFixed(2)} qqs.</p>
                            </ResultCard>
                            {result.origin && result.origin.length > 0 && <ResultCard title="Origen (Insumos)" color="blue" icon={<span>&#8592;</span>}>
                               <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.origin.map((o: ThreshingOrderReceipt) => (
                                        <li key={o.id}><strong>{o.inputType} {o.receiptNumber}</strong> ({o.amountToThresh.toFixed(2)} qqs.)</li>
                                    ))}
                               </ul>
                            </ResultCard>}
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-2">
                                    {result.destinations.map((dest: any) => dest.docs.map((doc: any) => (
                                        <li key={doc.id}>Liquidada en <strong>{dest.type}</strong>: {doc.rendimientoNumber}</li>
                                    )))}
                                </ul>
                            </ResultCard>}
                        </>
                    )}
                    {result.type === 'rendimiento' && (
                        <>
                             <ResultCard title={`Rendimiento: ${result.data.rendimientoNumber}`} color="orange" icon={'RN'}>
                                <p><strong>Primeras Reales:</strong> {result.data.totalRealPrimeras.toFixed(2)} qqs.</p>
                                <p><strong>Catadura Real:</strong> {result.data.totalRealCatadura.toFixed(2)} qqs.</p>
                            </ResultCard>
                            {result.origin && result.origin.length > 0 && <ResultCard title="Origen (Órdenes Liquidadas)" color="blue" icon={<span>&#8592;</span>}>
                               <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.origin.map((o: ThreshingOrder) => <li key={o.id}><strong>{o.orderNumber}</strong></li>)}
                               </ul>
                            </ResultCard>}
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos (Viñetas Producidas)" color="green" icon={<span>&#8594;</span>}>
                               <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.destinations[0].docs.map((v: Viñeta) => (
                                        <li key={v.id}><strong>{v.numeroViñeta}</strong> ({v.tipo}, {v.pesoNeto.toFixed(2)} qqs.)</li>
                                    ))}
                               </ul>
                            </ResultCard>}
                        </>
                    )}
                    {result.type === 'reproceso' && (
                        <>
                            <ResultCard title={`Reproceso: ${result.data.reprocesoNumber}`} color="rose" icon={'RP'}>
                                <p><strong>Total Entrada:</strong> {result.data.totalInputWeight.toFixed(2)} qqs.</p>
                                <p><strong>Total Salida:</strong> {result.data.totalOutputWeight.toFixed(2)} qqs.</p>
                                <p><strong>Merma:</strong> {result.data.merma.toFixed(2)} qqs.</p>
                            </ResultCard>
                             {result.origin && result.origin.length > 0 && <ResultCard title="Origen (Viñetas de Entrada)" color="blue" icon={<span>&#8592;</span>}>
                               <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.origin.map((v: Viñeta) => <li key={v.id}><strong>{v.numeroViñeta}</strong> ({v.pesoNeto.toFixed(2)} qqs.)</li>)}
                               </ul>
                            </ResultCard>}
                            {result.destinations && result.destinations.length > 0 && <ResultCard title="Destinos (Viñetas de Salida)" color="green" icon={<span>&#8594;</span>}>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.destinations[0].docs.map((v: Viñeta) => (
                                        <li key={v.id}><strong>{v.numeroViñeta}</strong> ({v.tipo}, {v.pesoNeto.toFixed(2)} qqs.)</li>
                                    ))}
                               </ul>
                            </ResultCard>}
                        </>
                    )}
                    {result.type === 'salida' && (
                        <>
                            <ResultCard title={`Salida: ${result.data.salidaNumber}`} color="indigo" icon={'S'}>
                                <p><strong>Tipo:</strong> {result.data.tipoSalida}</p>
                                <p><strong>Destino:</strong> {result.data.clienteName}</p>
                                <p><strong>Peso Neto:</strong> {result.data.pesoNeto.toFixed(2)} qqs.</p>
                            </ResultCard>
                            {result.origin && result.origin.length > 0 && <ResultCard title="Origen (Productos Despachados)" color="blue" icon={<span>&#8592;</span>}>
                               <ul className="list-disc list-inside space-y-1 text-sm">
                                    {result.origin.map((item: SalidaMezclaInput | SalidaReciboInput) => {
                                        if('mezclaNumber' in item) return <li key={item.mezclaId}><strong>Mezcla {item.mezclaNumber}</strong> ({item.pesoUtilizado.toFixed(2)} qqs.)</li>;
                                        if('reciboNumber' in item) return <li key={item.reciboId}><strong>Recibo {item.reciboNumber}</strong> ({item.pesoDevuelto.toFixed(2)} qqs.)</li>;
                                        return null;
                                    })}
                               </ul>
                            </ResultCard>}
                        </>
                    )}
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
