import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Contract, ContractLot, Exporter } from '../types';

interface AddContractLotFormProps {
    contract: Contract;
    exporter: Exporter;
    existingLots: ContractLot[];
}

const AddContractLotForm: React.FC<AddContractLotFormProps> = ({ contract, exporter, existingLots }) => {
    const [lot, setLot] = useState<Omit<ContractLot, 'id' | 'contractId'>>({
        partida: '',
        bultos: 0,
        pesoKg: 0,
        pesoQqs: 0,
        fijacion: 0,
        fechaFijacion: new Date().toISOString().split('T')[0],
        precioFinal: 0,
        guiaMuestra: '',
        fechaEnvioMuestra: new Date().toISOString().split('T')[0],
        muestraAprobada: false,
        destino: '',
        isf: false,
        booking: '',
        naviera: 'Maersk',
        valorCobro: 0,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const navierasPopulares = ["Maersk", "Hapag-Lloyd", "CMA-CGM", "Seaboard Marine", "ONE Line", "MSC", "Evergreen Line"];
    const usDestinations = ["new york", "los angeles", "miami", "houston", "seattle", "oakland", "long beach"]; // Example list

    // Auto-calculate fields whenever dependencies change
    useEffect(() => {
        const nextCorrelative = (existingLots.length > 0 ? Math.max(...existingLots.map(l => parseInt(l.partida.split('/')[2]) || 0)) : 0) + 1;
        const partida = `11/${exporter.licenseNumber}/${nextCorrelative}`;

        const pesoQqs = calculatePesoQqs(lot.bultos, lot.pesoKg, contract.priceUnit);
        const precioFinal = lot.fijacion + contract.differential;
        const valorCobro = calculateValorCobro(lot.bultos, lot.pesoKg, precioFinal, contract.priceUnit);
        const isf = usDestinations.some(d => lot.destino.toLowerCase().includes(d));

        setLot(prev => ({
            ...prev,
            partida,
            pesoQqs,
            precioFinal,
            valorCobro,
            isf,
        }));
    }, [lot.bultos, lot.pesoKg, lot.fijacion, contract.priceUnit, contract.differential, existingLots, exporter.licenseNumber, lot.destino]);


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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const isNumber = type === 'number';

        setLot(prev => ({
            ...prev,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : isNumber ? parseFloat(value) || 0 : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (lot.bultos <= 0 || lot.pesoKg <= 0) {
            setError('El número de bultos y el peso deben ser mayores a cero.');
            return;
        }
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'contractLots'), {
                ...lot,
                contractId: contract.id,
            });
            // Reset form could happen here, but for now we keep it to allow quick edits
        } catch (err) {
            console.error(err);
            setError('No se pudo guardar la partida.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Agregar Nueva Partida</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="text-sm text-muted-foreground">Partida</label><p className="font-semibold text-foreground">{lot.partida || '...'}</p></div>
                    <div><label htmlFor="bultos" className="text-sm text-muted-foreground">No. Bultos</label><input type="number" id="bultos" name="bultos" value={lot.bultos} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div><label htmlFor="pesoKg" className="text-sm text-muted-foreground">Peso Kg.</label><input type="number" id="pesoKg" name="pesoKg" value={lot.pesoKg} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div><label className="text-sm text-muted-foreground">Peso qqs.</label><p className="font-semibold text-foreground mt-1 p-2">{lot.pesoQqs.toFixed(4)}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div><label htmlFor="fijacion" className="text-sm text-muted-foreground">Fijación ($)</label><input type="number" id="fijacion" name="fijacion" value={lot.fijacion} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                     <div><label htmlFor="fechaFijacion" className="text-sm text-muted-foreground">Fecha Fijación</label><input type="date" id="fechaFijacion" name="fechaFijacion" value={lot.fechaFijacion} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                     <div><label className="text-sm text-muted-foreground">Precio Final</label><p className="font-semibold text-foreground mt-1 p-2">${lot.precioFinal.toFixed(2)}</p></div>
                     <div><label htmlFor="pdfFijacion" className="text-sm text-muted-foreground">PDF Fijación</label><input type="file" id="pdfFijacion" name="pdfFijacion" className="w-full text-sm mt-1"/></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                    <div><label htmlFor="guiaMuestra" className="text-sm text-muted-foreground">Guía Muestra</label><input type="text" id="guiaMuestra" name="guiaMuestra" value={lot.guiaMuestra} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div><label htmlFor="fechaEnvioMuestra" className="text-sm text-muted-foreground">Fecha Envío Muestra</label><input type="date" id="fechaEnvioMuestra" name="fechaEnvioMuestra" value={lot.fechaEnvioMuestra} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div className="flex items-end"><label className="flex items-center gap-2"><input type="checkbox" name="muestraAprobada" checked={lot.muestraAprobada} onChange={handleInputChange}/> Muestra Aprobada</label></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label htmlFor="destino" className="text-sm text-muted-foreground">Destino</label><input type="text" id="destino" name="destino" value={lot.destino} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input" placeholder="Ej: New York, USA"/></div>
                    <div><label className="text-sm text-muted-foreground">ISF</label><p className={`font-semibold p-2 mt-1 ${lot.isf ? 'text-green-600' : 'text-red-600'}`}>{lot.isf ? 'Sí (Auto)' : 'No (Auto)'}</p></div>
                    <div><label htmlFor="booking" className="text-sm text-muted-foreground">Booking</label><input type="text" id="booking" name="booking" value={lot.booking} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                    <div><label htmlFor="naviera" className="text-sm text-muted-foreground">Naviera</label>
                        <select id="naviera" name="naviera" value={lot.naviera} onChange={handleInputChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input">
                            {navierasPopulares.map(n => <option key={n} value={n}>{n}</option>)}
                            <option value="Otra">Otra</option>
                        </select>
                    </div>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-6">
                    <div className="md:col-span-3"></div>
                     <div><label className="text-sm text-muted-foreground">Valor del Cobro ($)</label><p className="font-semibold text-2xl text-green-600 mt-1">${lot.valorCobro.toFixed(2)}</p></div>
                 </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                
                <div className="flex justify-end">
                    <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                        {isSaving ? 'Guardando...' : 'Agregar Partida'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddContractLotForm;
