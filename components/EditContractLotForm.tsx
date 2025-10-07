import React, { useState, useEffect, useRef } from 'react';
import { Contract, ContractLot } from '../types';

interface EditContractLotFormProps {
    lot: ContractLot;
    contract: Contract;
    onSave: (updatedLot: ContractLot) => void;
    onCancel: () => void;
}

const EditContractLotForm: React.FC<EditContractLotFormProps> = ({ lot, contract, onSave, onCancel }) => {
    const [formData, setFormData] = useState<any>({
        ...lot,
        bultos: lot.bultos.toString(),
        pesoKg: lot.pesoKg.toString(),
        fijacion: lot.fijacion.toString(),
    });
    const [customNaviera, setCustomNaviera] = useState('');
    const [customEmpaque, setCustomEmpaque] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [pdfFijacionFile, setPdfFijacionFile] = useState<File | null>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    
    const navierasPopulares = ["Maersk", "Hapag-Lloyd", "CMA-CGM", "Seaboard Marine", "ONE Line", "MSC", "Evergreen Line"];
    const empaqueOptions = ["Saco de Yute", "GrainPro", "Caja", "Big Bag", "Jumbo", "Otro"];
    const showIsfSuggestion = formData.destino.toLowerCase().includes('usa') || formData.destino.toLowerCase().includes('ee.uu');

    useEffect(() => {
        if (!navierasPopulares.includes(formData.naviera) && formData.naviera) {
            setCustomNaviera(formData.naviera);
            setFormData((prev: any) => ({ ...prev, naviera: 'Otra' }));
        }
        if (!empaqueOptions.includes(formData.empaque) && formData.empaque) {
            setCustomEmpaque(formData.empaque);
            setFormData((prev: any) => ({ ...prev, empaque: 'Otro'}));
        }
    }, []);

    useEffect(() => {
        const bultosNum = parseFloat(formData.bultos) || 0;
        const pesoKgNum = parseFloat(formData.pesoKg) || 0;
        const fijacionNum = parseFloat(formData.fijacion) || 0;
        
        const pesoQqs = calculatePesoQqs(bultosNum, pesoKgNum, contract.priceUnit);
        const precioFinal = fijacionNum + contract.differential;
        const valorCobro = calculateValorCobro(bultosNum, pesoKgNum, precioFinal, contract.priceUnit);

        setFormData((prev: any) => ({
            ...prev,
            pesoQqs,
            precioFinal,
            valorCobro,
        }));
    }, [formData.bultos, formData.pesoKg, formData.fijacion, contract.differential, contract.priceUnit, formData.destino]);

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
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const isBooleanSelect = ['muestraAprobada', 'isf'].includes(name);

        setFormData((prev: any) => ({
            ...prev,
            [name]: isCheckbox 
                ? (e.target as HTMLInputElement).checked 
                : isBooleanSelect ? value === 'true' : value,
        }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const finalNaviera = formData.naviera === 'Otra' ? customNaviera : formData.naviera;
        const finalEmpaque = formData.empaque === 'Otro' ? customEmpaque : formData.empaque;
        const updatedLot: ContractLot = {
            ...formData,
            bultos: parseFloat(formData.bultos) || 0,
            pesoKg: parseFloat(formData.pesoKg) || 0,
            fijacion: parseFloat(formData.fijacion) || 0,
            naviera: finalNaviera,
            empaque: finalEmpaque,
        };
        await onSave(updatedLot);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-foreground mb-4">Editar Partida: {lot.partida}</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div><label className="text-sm text-muted-foreground">Partida</label><p className="font-semibold text-foreground mt-1 p-2">{formData.partida}</p></div>
                        <div><label htmlFor="bultos" className="text-sm text-muted-foreground">No. Bultos</label><input type="number" id="bultos" name="bultos" value={formData.bultos} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div className="space-y-1">
                            <label htmlFor="empaque" className="text-sm text-muted-foreground">Empaque</label>
                            <select id="empaque" name="empaque" value={formData.empaque} onChange={handleChange} className="w-full p-2 border rounded-md bg-background border-input">
                                {empaqueOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                             {formData.empaque === 'Otro' && (
                                <input type="text" value={customEmpaque} onChange={(e) => setCustomEmpaque(e.target.value)} placeholder="Tipo de empaque" className="w-full mt-1 p-2 border rounded-md bg-background border-input"/>
                            )}
                        </div>
                        <div><label htmlFor="pesoKg" className="text-sm text-muted-foreground">Peso Kg.</label><input type="number" id="pesoKg" name="pesoKg" value={formData.pesoKg} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div><label className="text-sm text-muted-foreground">Peso qqs.</label><p className="font-semibold text-foreground mt-1 p-2">{formData.pesoQqs.toFixed(2)}</p></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div><label htmlFor="fijacion" className="text-sm text-muted-foreground">Fijación ($)</label><input type="number" step="any" id="fijacion" name="fijacion" value={formData.fijacion} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div><label htmlFor="fechaFijacion" className="text-sm text-muted-foreground">Fecha Fijación</label><input type="date" id="fechaFijacion" name="fechaFijacion" value={formData.fechaFijacion} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div><label className="text-sm text-muted-foreground">Precio Final</label><p className="font-semibold text-foreground mt-1 p-2">${formData.precioFinal.toFixed(2)}</p></div>
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">PDF Fijación</label>
                            <button type="button" onClick={() => pdfInputRef.current?.click()} className="w-full text-sm font-semibold text-green-700 bg-green-100 hover:bg-green-200/50 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 px-4 py-2 rounded-lg transition-colors">
                                Seleccionar archivo
                            </button>
                            <input type="file" ref={pdfInputRef} onChange={e => setPdfFijacionFile(e.target.files?.[0] || null)} className="hidden" />
                            {pdfFijacionFile && <p className="text-xs text-muted-foreground mt-1">{pdfFijacionFile.name}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                        <div><label htmlFor="guiaMuestra" className="text-sm text-muted-foreground">Guía Muestra</label><input type="text" id="guiaMuestra" name="guiaMuestra" value={formData.guiaMuestra} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div><label htmlFor="fechaEnvioMuestra" className="text-sm text-muted-foreground">Fecha Envío Muestra</label><input type="date" id="fechaEnvioMuestra" name="fechaEnvioMuestra" value={formData.fechaEnvioMuestra} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div className="w-full"><label htmlFor="muestraAprobada" className="text-sm text-muted-foreground">Muestra Aprobada</label>
                            <select name="muestraAprobada" id="muestraAprobada" value={String(formData.muestraAprobada)} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input">
                                <option value="false">No</option>
                                <option value="true">Sí</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div><label htmlFor="destino" className="text-sm text-muted-foreground">Destino</label><input type="text" id="destino" name="destino" value={formData.destino} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div><label htmlFor="isf" className="text-sm text-muted-foreground">ISF Requerido</label>
                            <select name="isf" id="isf" value={String(formData.isf)} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input">
                                <option value="false">No</option>
                                <option value="true">Sí</option>
                            </select>
                            {showIsfSuggestion && <p className="text-xs text-blue-500 mt-1">Destino parece ser EE.UU. ¿Se requiere ISF?</p>}
                        </div>
                        <div><label htmlFor="booking" className="text-sm text-muted-foreground">Booking</label><input type="text" id="booking" name="booking" value={formData.booking} onChange={handleChange} className="w-full mt-1 p-2 border rounded-md bg-background border-input"/></div>
                        <div className="space-y-1">
                            <label htmlFor="naviera" className="text-sm text-muted-foreground">Naviera</label>
                            <select id="naviera" name="naviera" value={formData.naviera} onChange={handleChange} className="w-full p-2 border rounded-md bg-background border-input">
                                <option value="">Selecciona una naviera</option>
                                {navierasPopulares.map(n => <option key={n} value={n}>{n}</option>)}
                                <option value="Otra">Otra (especificar)</option>
                            </select>
                            {formData.naviera === 'Otra' && (
                                <input type="text" value={customNaviera} onChange={(e) => setCustomNaviera(e.target.value)} placeholder="Nombre de la naviera" className="w-full mt-1 p-2 border rounded-md bg-background border-input"/>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditContractLotForm;