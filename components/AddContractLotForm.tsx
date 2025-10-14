import React, { useState, useEffect, useRef } from 'react';
import api from '../services/localStorageManager';
import { Contract, ContractLot, Exporter } from '../types';
import ToggleSwitch from './ToggleSwitch';

interface AddContractLotFormProps {
    contract: Contract;
    exporter: Exporter;
    existingLots: ContractLot[];
    onCancel: () => void;
    onLotAdded: () => void;
}

const AddContractLotForm: React.FC<AddContractLotFormProps> = ({ contract, exporter, existingLots, onCancel, onLotAdded }) => {
    const initialLotState = {
        partida: '',
        bultos: '',
        empaque: 'Saco de Yute',
        pesoKg: '',
        pesoQqs: 0,
        fijacion: '',
        fechaFijacion: new Date().toISOString().split('T')[0],
        precioFinal: 0,
        guiaMuestra: '',
        fechaEnvioMuestra: new Date().toISOString().split('T')[0],
        muestraAprobada: false,
        destino: '',
        isf: false,
        isfSent: false,
        booking: '',
        naviera: '',
        valorCobro: 0,
    };

    const [lot, setLot] = useState<any>(initialLotState);
    const [customNaviera, setCustomNaviera] = useState('');
    const [customEmpaque, setCustomEmpaque] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [pdfFijacionFile, setPdfFijacionFile] = useState<File | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const navierasPopulares = ["Maersk", "Hapag-Lloyd", "CMA-CGM", "Seaboard Marine", "ONE Line", "MSC", "Evergreen Line"];
    const empaqueOptions = ["Saco de Yute", "GrainPro", "Caja", "Big Bag", "Jumbo", "Otro"];
    const showIsfSuggestion = lot.destino.toLowerCase().includes('usa') || lot.destino.toLowerCase().includes('ee.uu');
    
    useEffect(() => {
        const setPartidaNumber = async () => {
            const exporterLots = await api.getCollection<ContractLot>('contractLots', l => 
                l.partida.startsWith(`11/${exporter.licenseNumber}/`) && l.añoCosecha === contract.añoCosecha
            );
            let nextNum = 1;
            if (exporterLots.length > 0) {
                const usedCorrelatives = Array.from(new Set(exporterLots
                    .map(l => parseInt(l.partida.split('/')[2], 10))
                    .filter(n => !isNaN(n))))
                    .sort((a, b) => a - b);
                
                for (const num of usedCorrelatives) {
                    if (num === nextNum) {
                        nextNum++;
                    } else {
                        break; // Found a gap
                    }
                }
            }
            const partida = `11/${exporter.licenseNumber}/${nextNum}`;
            setLot((prev: any) => ({...prev, partida}));
        };
        setPartidaNumber();
    }, [exporter.licenseNumber, contract.añoCosecha]);

    const calculatePesoQqs = (bultos: number, pesoKg: number, priceUnit: 'CTS/LB' | '46 Kg.') => {
        if (bultos <= 0 || pesoKg <= 0) return 0;
        const totalKg = bultos * pesoKg;
        if (priceUnit === 'CTS/LB') {
            return (totalKg / 46 * 101.413) / 100;
        }
        return totalKg / 46;
    };
    
    const calculateValorCobro = (bultos: number, pesoKg: number, precioFinal: number, priceUnit: 'CTS/LB' | '46 Kg.') => {
        if (bultos <= 0 || pesoKg <= 0 || precioFinal <= 0) return 0;
        const totalKg = bultos * pesoKg;
        if (priceUnit === 'CTS/LB') {
            return ((totalKg / 46 * 101.413) / 100) * precioFinal;
        }
        return (totalKg / 46) * precioFinal;
    };

    useEffect(() => {
        const bultosNum = parseFloat(lot.bultos) || 0;
        const pesoKgNum = parseFloat(lot.pesoKg) || 0;
        const fijacionNum = parseFloat(lot.fijacion) || 0;
        
        const pesoQqs = calculatePesoQqs(bultosNum, pesoKgNum, contract.priceUnit);
        const precioFinal = fijacionNum + contract.differential;
        const valorCobro = calculateValorCobro(bultosNum, pesoKgNum, precioFinal, contract.priceUnit);

        setLot((prev: any) => ({
            ...prev,
            pesoQqs,
            precioFinal,
            valorCobro,
        }));
    }, [lot.bultos, lot.pesoKg, lot.fijacion, contract.differential, contract.priceUnit]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const isBooleanSelect = ['muestraAprobada', 'isf'].includes(name);

        setLot((prev: any) => ({
            ...prev,
            [name]: isCheckbox 
                ? (e.target as HTMLInputElement).checked 
                : isBooleanSelect ? value === 'true' : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);
        try {
            const finalNaviera = lot.naviera === 'Otra' ? customNaviera : lot.naviera;
            const finalEmpaque = lot.empaque === 'Otro' ? customEmpaque : lot.empaque;
            
            await api.addDocument('contractLots', {
                ...lot,
                bultos: parseFloat(lot.bultos) || 0,
                pesoKg: parseFloat(lot.pesoKg) || 0,
                fijacion: parseFloat(lot.fijacion) || 0,
                naviera: finalNaviera,
                empaque: finalEmpaque,
                contractId: contract.id,
                añoCosecha: contract.añoCosecha,
            });
            onLotAdded();
        } catch (err) {
            console.error(err);
            setError('No se pudo guardar la partida.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={onCancel} className="text-sm font-medium text-green-600 hover:underline">
                &larr; Volver al Contrato
            </button>
            <h2 className="text-2xl font-bold text-foreground">Agregar Partida al Contrato <span className="text-green-600">{contract.contractNumber}</span></h2>
            
            <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg shadow-sm p-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div><label className="text-sm text-muted-foreground">Partida</label><p className="font-semibold text-green-600 dark:text-green-400 mt-1 p-2">{lot.partida || '...'}</p></div>
                    <div><label htmlFor="bultos" className="text-sm text-muted-foreground">No. Bultos</label><input type="number" id="bultos" name="bultos" value={lot.bultos} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div className="space-y-1">
                        <label htmlFor="empaque" className="text-sm text-muted-foreground">Empaque</label>
                        <select id="empaque" name="empaque" value={lot.empaque} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input">
                            {empaqueOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        {lot.empaque === 'Otro' && (
                             <input type="text" value={customEmpaque} onChange={(e) => setCustomEmpaque(e.target.value)} placeholder="Tipo de empaque" className="w-full mt-1 p-2 border rounded-md bg-background border-input"/>
                        )}
                    </div>
                    <div><label htmlFor="pesoKg" className="text-sm text-muted-foreground">Peso Kg.</label><input type="number" id="pesoKg" name="pesoKg" value={lot.pesoKg} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div><label className="text-sm text-muted-foreground">Peso qqs.</label><p className="font-semibold text-foreground mt-1 p-2">{lot.pesoQqs.toFixed(2)}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                     <div><label htmlFor="fijacion" className="text-sm text-muted-foreground">Fijación ($)</label><input type="number" step="any" id="fijacion" name="fijacion" value={lot.fijacion} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                     <div><label htmlFor="fechaFijacion" className="text-sm text-muted-foreground">Fecha Fijación</label><input type="date" id="fechaFijacion" name="fechaFijacion" value={lot.fechaFijacion} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                     <div><label className="text-sm text-muted-foreground">Precio Final</label><p className="font-semibold text-foreground mt-1 p-2">${lot.precioFinal.toFixed(2)}</p></div>
                     <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">PDF Fijación</label>
                        <button type="button" onClick={() => pdfInputRef.current?.click()} className="w-full text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200/50 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 px-4 py-2 rounded-lg transition-colors">
                            Seleccionar archivo
                        </button>
                        <input type="file" ref={pdfInputRef} onChange={e => setPdfFijacionFile(e.target.files?.[0] || null)} className="hidden" />
                        {pdfFijacionFile && <p className="text-xs text-muted-foreground mt-1">{pdfFijacionFile.name}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6 items-center">
                    <div><label htmlFor="guiaMuestra" className="text-sm text-muted-foreground">Guía Muestra</label><input type="text" id="guiaMuestra" name="guiaMuestra" value={lot.guiaMuestra} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div><label htmlFor="fechaEnvioMuestra" className="text-sm text-muted-foreground">Fecha Envío Muestra</label><input type="date" id="fechaEnvioMuestra" name="fechaEnvioMuestra" value={lot.fechaEnvioMuestra} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Muestra Aprobada</label>
                        <ToggleSwitch id="muestraAprobada" checked={lot.muestraAprobada} onChange={(checked) => setLot((prev: any) => ({ ...prev, muestraAprobada: checked }))} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div><label htmlFor="destino" className="text-sm text-muted-foreground">Destino</label><input type="text" id="destino" name="destino" value={lot.destino} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input" placeholder="Ej: New York, USA"/></div>
                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">ISF Requerido</label>
                        <ToggleSwitch id="isf" checked={lot.isf} onChange={(checked) => setLot((prev: any) => ({...prev, isf: checked, isfSent: checked ? prev.isfSent : false }))} />
                        {showIsfSuggestion && !lot.isf && <p className="text-xs text-blue-500 mt-1">Destino parece ser EE.UU. ¿Se requiere ISF?</p>}
                    </div>
                     {lot.isf && (
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">ISF Enviado</label>
                            <ToggleSwitch id="isfSent" checked={lot.isfSent} onChange={(checked) => setLot((prev: any) => ({ ...prev, isfSent: checked }))} />
                        </div>
                    )}
                    <div><label htmlFor="booking" className="text-sm text-muted-foreground">Booking</label><input type="text" id="booking" name="booking" value={lot.booking} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div className="space-y-1">
                        <label htmlFor="naviera" className="text-sm text-muted-foreground">Naviera</label>
                        <select id="naviera" name="naviera" value={lot.naviera} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background border-input">
                            <option value="">Selecciona una naviera</option>
                            {navierasPopulares.map(n => <option key={n} value={n}>{n}</option>)}
                            <option value="Otra">Otra (especificar)</option>
                        </select>
                        {lot.naviera === 'Otra' && (
                            <input type="text" value={customNaviera} onChange={(e) => setCustomNaviera(e.target.value)} placeholder="Nombre de la naviera" className="w-full mt-1 p-2 border rounded-md bg-background border-input"/>
                        )}
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-6">
                    <div className="md:col-span-3"></div>
                     <div><label className="text-sm text-muted-foreground">Valor del Cobro ($)</label><p className="font-semibold text-2xl text-green-600 mt-1">${lot.valorCobro.toFixed(2)}</p></div>
                 </div>

                {error && <p className="text-sm text-center text-red-500">{error}</p>}
                
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                        {isSaving ? 'Guardando...' : 'Agregar Partida'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddContractLotForm;