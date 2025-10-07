

import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { PurchaseReceipt, Supplier, CuppingProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ReceiptFormProps {
    existingReceipt?: PurchaseReceipt | null;
    suppliers: Supplier[];
    onCancel: () => void;
    onSaveSuccess: (savedReceipt: PurchaseReceipt) => void;
}

const allCertifications = ['Rainforest', 'Orgánico', 'Fairtrade', 'EUDR'];
const coffeeTypes = ['Pergamino', 'Cereza', 'Oro Lavado', 'Oro Natural', 'Natas', 'Otro'];
const roastLevels: CuppingProfile['roastLevel'][] = ['', 'Ligero', 'Medio', 'Oscuro'];

const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-border pb-3">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
            {children}
        </div>
    </div>
);

const TextInput: React.FC<{ name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; parent?: string }> = ({ name, label, value, onChange, placeholder, parent }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <input type="text" id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} data-parent={parent} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border focus:ring-green-500 focus:border-green-500" />
    </div>
);

const NumberInput: React.FC<{ name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string; placeholder?: string; disabled?: boolean; parent?: string; min?: string; max?: string; }> = ({ name, label, value, onChange, step = "any", placeholder, disabled = false, parent, min, max }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <input type="number" id={name} name={name} value={value} onChange={onChange} step={step} placeholder={placeholder} disabled={disabled} data-parent={parent} min={min} max={max} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border focus:ring-green-500 focus:border-green-500 disabled:bg-muted disabled:cursor-not-allowed" />
    </div>
);

const CalculatedField: React.FC<{ label: string, value: number | string, isPercentage?: boolean, isCurrency?: boolean }> = ({ label, value, isPercentage, isCurrency }) => (
    <div>
        <label className="block text-sm font-medium text-muted-foreground">{label}</label>
        <div className="mt-1 w-full p-2 font-semibold text-foreground bg-muted/50 rounded-md min-h-[42px] flex items-center">
            {typeof value === 'number'
                ? `${isCurrency ? 'Q' : ''}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${isPercentage ? '%' : ''}`
                : value
            }
        </div>
    </div>
);


const ReceiptForm: React.FC<ReceiptFormProps> = ({ existingReceipt, suppliers, onCancel, onSaveSuccess }) => {
    const { user } = useAuth();
    const isEditMode = !!existingReceipt;

    const getInitialState = () => {
        const cuppingInitial = {
            score: '', fragranceAroma: '', flavor: '', aftertaste: '', acidity: '', body: '',
            balance: '', uniformity: '', cleanCup: '', sweetness: '', notes: '', defects: '',
            roastLevel: '', cuppingDate: new Date().toISOString().split('T')[0],
        };

        return {
            certificacion: existingReceipt?.certificacion || [],
            fecha: existingReceipt?.fecha || new Date().toISOString().split('T')[0],
            recibo: existingReceipt?.recibo || '',
            proveedorId: existingReceipt?.proveedorId || '',
            placaVehiculo: existingReceipt?.placaVehiculo || '',
            piloto: existingReceipt?.piloto || '',
            tipo: existingReceipt?.tipo || 'Pergamino',
            customTipo: existingReceipt?.customTipo || '',
            pesoBruto: existingReceipt?.pesoBruto?.toString() || '',
            yute: existingReceipt?.yute?.toString() || '',
            nylon: existingReceipt?.nylon?.toString() || '',
            tara: existingReceipt?.tara?.toString() || '',
            precio: existingReceipt?.precio?.toString() || '',
            gMuestra: existingReceipt?.gMuestra?.toString() || '',
            gPrimera: existingReceipt?.gPrimera?.toString() || '',
            gRechazo: existingReceipt?.gRechazo?.toString() || '',
            precioCatadura: existingReceipt?.precioCatadura?.toString() || '',
            pesoBrutoEnvio: existingReceipt?.pesoBrutoEnvio?.toString() || '',
            trillado: existingReceipt?.trillado?.toString() || '',
            enBodega: existingReceipt?.enBodega?.toString() || '',
            reciboDevuelto: existingReceipt?.reciboDevuelto || false,
            notas: existingReceipt?.notas || '',
            cuppingProfile: {
                ...cuppingInitial,
                ...Object.fromEntries(
                  Object.entries(existingReceipt?.cuppingProfile || {}).map(([key, value]) => [
                    key,
                    value !== null && value !== undefined ? value.toString() : '',
                  ])
                ),
            }
        };
    };

    const [formData, setFormData] = useState<any>(getInitialState());
    const [isSaving, setIsSaving] = useState(false);
    const [isTaraOverridden, setIsTaraOverridden] = useState(false);
    
    useEffect(() => {
        const setReciboNumber = async () => {
            if (!isEditMode) {
                const allReceipts = await api.getCollection<PurchaseReceipt>('purchaseReceipts');
                const nextId = allReceipts.length > 0 ? Math.max(0, ...allReceipts.map(r => parseInt(r.recibo, 10))) + 1 : 1;
                setFormData((prev: any) => ({ ...prev, recibo: nextId.toString() }));
            }
        };
        setReciboNumber();
    }, [isEditMode]);

    const calculations = useMemo(() => {
        const pesoBruto = parseFloat(formData.pesoBruto) || 0;
        const yute = parseFloat(formData.yute) || 0;
        const nylon = parseFloat(formData.nylon) || 0;
        const taraInput = parseFloat(formData.tara) || 0;
        const gMuestra = parseFloat(formData.gMuestra) || 0;
        const gPrimera = parseFloat(formData.gPrimera) || 0;
        const gRechazo = parseFloat(formData.gRechazo) || 0;
        const precio = parseFloat(formData.precio) || 0;
        const precioCatadura = parseFloat(formData.precioCatadura) || 0;
        const pesoBrutoEnvio = parseFloat(formData.pesoBrutoEnvio) || 0;
        
        const taraSugerida = (yute * 0.02) + (nylon * 0.01);
        const tara = isTaraOverridden ? taraInput : taraSugerida;
        const pesoNeto = pesoBruto - tara;
        const primera = gMuestra > 0 ? pesoNeto * (gPrimera / gMuestra) : 0;
        const rechazo = gMuestra > 0 ? pesoNeto * (gRechazo / gMuestra) : 0;
        const totalBruto = primera + rechazo;
        const rendimientoTotal = pesoNeto > 0 ? totalBruto / pesoNeto * 100 : 0;
        const rendimientoPrimera = pesoNeto > 0 ? primera / pesoNeto * 100 : 0;
        const rendimientoRechazo = pesoNeto > 0 ? rechazo / pesoNeto * 100 : 0;
        const totalCompra = pesoBruto * precio;
        const costoCatadura = precioCatadura * rechazo;
        const diferencia = pesoBruto - pesoBrutoEnvio;

        return { taraSugerida, tara, pesoNeto, primera, rechazo, totalBruto, rendimientoTotal, rendimientoPrimera, rendimientoRechazo, totalCompra, costoCatadura, diferencia };
    }, [formData, isTaraOverridden]);

    useEffect(() => {
        if (!isTaraOverridden) {
            setFormData((prev: any) => ({...prev, tara: calculations.taraSugerida.toFixed(2)}));
        }
    }, [calculations.taraSugerida, isTaraOverridden]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const parent = (e.target as HTMLElement).getAttribute('data-parent');

        if (parent) {
             setFormData((prev: any) => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [name]: value,
                }
            }));
            return;
        }
        
        const isCheckbox = type === 'checkbox';
        if (isCheckbox) {
            const certValue = (e.target as HTMLInputElement).value;
            setFormData((prev: any) => ({
                ...prev,
                certificacion: prev.certificacion.includes(certValue)
                    ? prev.certificacion.filter((c: string) => c !== certValue)
                    : [...prev.certificacion, certValue]
            }));
            return;
        }

        const isBooleanSelect = name === 'reciboDevuelto';
        setFormData((prev: any) => ({
            ...prev,
            [name]: isBooleanSelect ? (value === 'true') : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.proveedorId) {
            alert("Por favor, selecciona un proveedor.");
            return;
        }
        setIsSaving(true);
        try {
            const finalData: Omit<PurchaseReceipt, 'id'> = {
                ...formData,
                status: existingReceipt?.status || 'Activo',
                ...calculations,
                tara: calculations.tara,
                pesoBruto: parseFloat(formData.pesoBruto) || 0,
                yute: parseInt(formData.yute) || 0,
                nylon: parseInt(formData.nylon) || 0,
                precio: parseFloat(formData.precio) || 0,
                gMuestra: parseInt(formData.gMuestra) || 0,
                gPrimera: parseInt(formData.gPrimera) || 0,
                gRechazo: parseInt(formData.gRechazo) || 0,
                precioCatadura: parseFloat(formData.precioCatadura) || 0,
                pesoBrutoEnvio: parseFloat(formData.pesoBrutoEnvio) || 0,
                trillado: parseFloat(formData.trillado) || 0,
                enBodega: parseFloat(formData.enBodega) || 0,
                // FIX: Replaced unsafe dynamic object creation with explicit, type-safe property assignment to resolve TypeScript error.
                cuppingProfile: {
                    score: parseFloat(formData.cuppingProfile.score) || 0,
                    fragranceAroma: parseFloat(formData.cuppingProfile.fragranceAroma) || 0,
                    flavor: parseFloat(formData.cuppingProfile.flavor) || 0,
                    aftertaste: parseFloat(formData.cuppingProfile.aftertaste) || 0,
                    acidity: parseFloat(formData.cuppingProfile.acidity) || 0,
                    body: parseFloat(formData.cuppingProfile.body) || 0,
                    balance: parseFloat(formData.cuppingProfile.balance) || 0,
                    uniformity: parseFloat(formData.cuppingProfile.uniformity) || 0,
                    cleanCup: parseFloat(formData.cuppingProfile.cleanCup) || 0,
                    sweetness: parseFloat(formData.cuppingProfile.sweetness) || 0,
                    notes: formData.cuppingProfile.notes,
                    defects: formData.cuppingProfile.defects,
                    roastLevel: formData.cuppingProfile.roastLevel,
                    cuppingDate: formData.cuppingProfile.cuppingDate,
                },
            };
            
            let savedReceipt;
            if (isEditMode) {
                savedReceipt = await api.updateDocument<PurchaseReceipt>('purchaseReceipts', existingReceipt.id, finalData);
            } else {
                savedReceipt = await api.addDocument<PurchaseReceipt>('purchaseReceipts', finalData);
            }
            onSaveSuccess(savedReceipt);
        } catch (error) {
            console.error("Error saving receipt:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = formData.proveedorId && !isSaving;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center p-4">
            <div className="bg-card rounded-lg shadow-xl max-w-6xl w-full h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 border-b border-border">
                    <h2 className="text-2xl font-bold text-foreground">{isEditMode ? `Editar Recibo N.° ${formData.recibo}` : 'Nuevo Recibo de Ingreso'}</h2>
                </header>
                
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-6 space-y-4">
                    
                    <FormSection title="Información General">
                        <CalculatedField label="Recibo N.°" value={formData.recibo} />
                         <div>
                            <label htmlFor="fecha" className="block text-sm font-medium text-muted-foreground">Fecha</label>
                            <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border" />
                        </div>
                        <div>
                            <label htmlFor="proveedorId" className="block text-sm font-medium text-muted-foreground">Proveedor *</label>
                            <select id="proveedorId" name="proveedorId" value={formData.proveedorId} onChange={handleInputChange} required className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                                <option value="">Seleccionar</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                         <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Certificación</label>
                            <div className="flex flex-col space-y-2 mt-2">
                                {allCertifications.map(cert => (
                                    <label key={cert} className="flex items-center gap-2 text-sm font-medium">
                                        <input type="checkbox" value={cert} name="certificacion" checked={formData.certificacion.includes(cert)} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/> {cert}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <TextInput name="placaVehiculo" label="Placa del Vehículo" value={formData.placaVehiculo} onChange={handleInputChange} />
                        <TextInput name="piloto" label="Piloto" value={formData.piloto} onChange={handleInputChange} />
                    </FormSection>

                    <FormSection title="Detalle del Café y Pesos">
                         <div>
                            <label htmlFor="tipo" className="block text-sm font-medium text-muted-foreground">Tipo de Café</label>
                            <select id="tipo" name="tipo" value={formData.tipo} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                                {coffeeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {formData.tipo === 'Otro' && (
                                <input type="text" id="customTipo" name="customTipo" value={formData.customTipo} onChange={handleInputChange} placeholder="Especificar tipo" className="mt-2 w-full p-2 border rounded-md bg-secondary border-border"/>
                            )}
                        </div>
                        <NumberInput name="pesoBruto" label="Peso Bruto" value={formData.pesoBruto} onChange={handleInputChange} />
                        <NumberInput name="yute" label="Yute (sacos)" value={formData.yute} onChange={handleInputChange} step="1" />
                        <NumberInput name="nylon" label="Nylon (Sacos)" value={formData.nylon} onChange={handleInputChange} step="1" />
                        <div className="relative">
                            <NumberInput name="tara" label="Tara" value={formData.tara} onChange={handleInputChange} disabled={!isTaraOverridden} />
                            {user?.role === 'Admin' && (
                                <div className="absolute top-1 right-1 flex items-center space-x-1">
                                    <label htmlFor="taraOverride" className="text-xs text-muted-foreground">Manual</label>
                                    <input id="taraOverride" type="checkbox" checked={isTaraOverridden} onChange={(e) => setIsTaraOverridden(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                </div>
                            )}
                        </div>
                        <CalculatedField label="Peso Neto" value={calculations.pesoNeto} />
                        <div><label className="block text-sm font-medium text-muted-foreground">PDF Recibo</label><button type="button" className="mt-1 w-full text-sm p-2 bg-muted hover:bg-muted/50 text-foreground rounded-md">Subir Archivo</button></div>
                        <div><label className="block text-sm font-medium text-muted-foreground">PDF Envío</label><button type="button" className="mt-1 w-full text-sm p-2 bg-muted hover:bg-muted/50 text-foreground rounded-md">Subir Archivo</button></div>
                    </FormSection>

                    <FormSection title="Análisis de Calidad y Rendimiento">
                        <NumberInput name="gMuestra" label="g Muestra" value={formData.gMuestra} onChange={handleInputChange} step="1" />
                        <NumberInput name="gPrimera" label="g Primera" value={formData.gPrimera} onChange={handleInputChange} step="1" />
                        <NumberInput name="gRechazo" label="g Rechazo" value={formData.gRechazo} onChange={handleInputChange} step="1" />
                        <div />
                        <CalculatedField label="Primera" value={calculations.primera} />
                        <CalculatedField label="Rechazo" value={calculations.rechazo} />
                        <CalculatedField label="Total Bruto" value={calculations.totalBruto} />
                        <div />
                        <CalculatedField label="% Rendimiento Total" value={calculations.rendimientoTotal} isPercentage />
                        <CalculatedField label="% Rendimiento de Primera" value={calculations.rendimientoPrimera} isPercentage />
                        <CalculatedField label="% Rendimiento de Rechazo" value={calculations.rendimientoRechazo} isPercentage />
                    </FormSection>

                    <FormSection title="Perfil de Catación">
                        <NumberInput parent="cuppingProfile" name="score" label="Puntaje Final (SCA)" value={formData.cuppingProfile.score} onChange={handleInputChange} min="0" max="100"/>
                        <NumberInput parent="cuppingProfile" name="fragranceAroma" label="Fragancia/Aroma" value={formData.cuppingProfile.fragranceAroma} onChange={handleInputChange} min="6" max="10" />
                        <NumberInput parent="cuppingProfile" name="flavor" label="Sabor" value={formData.cuppingProfile.flavor} onChange={handleInputChange} min="6" max="10" />
                        <NumberInput parent="cuppingProfile" name="aftertaste" label="Sabor Residual" value={formData.cuppingProfile.aftertaste} onChange={handleInputChange} min="6" max="10" />
                        <NumberInput parent="cuppingProfile" name="acidity" label="Acidez" value={formData.cuppingProfile.acidity} onChange={handleInputChange} min="6" max="10" />
                        <NumberInput parent="cuppingProfile" name="body" label="Cuerpo" value={formData.cuppingProfile.body} onChange={handleInputChange} min="6" max="10" />
                        <NumberInput parent="cuppingProfile" name="balance" label="Balance" value={formData.cuppingProfile.balance} onChange={handleInputChange} min="6" max="10" />
                         <div />
                        <NumberInput parent="cuppingProfile" name="uniformity" label="Uniformidad" value={formData.cuppingProfile.uniformity} onChange={handleInputChange} min="0" max="10" />
                        <NumberInput parent="cuppingProfile" name="cleanCup" label="Taza Limpia" value={formData.cuppingProfile.cleanCup} onChange={handleInputChange} min="0" max="10" />
                        <NumberInput parent="cuppingProfile" name="sweetness" label="Dulzura" value={formData.cuppingProfile.sweetness} onChange={handleInputChange} min="0" max="10" />
                         <div />
                         <div className="md:col-span-2">
                            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">Notas del Catador</label>
                            <textarea id="notes" name="notes" data-parent="cuppingProfile" value={formData.cuppingProfile.notes} onChange={handleInputChange} rows={3} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border" />
                        </div>
                         <div className="md:col-span-2">
                             <TextInput parent="cuppingProfile" name="defects" label="Defectos" value={formData.cuppingProfile.defects} onChange={handleInputChange} />
                         </div>
                         <div>
                            <label htmlFor="roastLevel" className="block text-sm font-medium text-muted-foreground">Nivel de Tueste</label>
                            <select id="roastLevel" name="roastLevel" data-parent="cuppingProfile" value={formData.cuppingProfile.roastLevel} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                                {roastLevels.map(t => <option key={t} value={t}>{t || 'Seleccionar'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="cuppingDate" className="block text-sm font-medium text-muted-foreground">Fecha de Catación</label>
                            <input type="date" id="cuppingDate" name="cuppingDate" data-parent="cuppingProfile" value={formData.cuppingProfile.cuppingDate} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border" />
                        </div>
                    </FormSection>

                     <FormSection title="Costos y Almacenamiento">
                        <NumberInput name="precio" label="Precio (Q)" value={formData.precio} onChange={handleInputChange}/>
                        <CalculatedField label="Total Compra (Q)" value={calculations.totalCompra} isCurrency />
                        <NumberInput name="precioCatadura" label="Precio Catadura (Q)" value={formData.precioCatadura} onChange={handleInputChange} />
                        <CalculatedField label="Costo Catadura (Q)" value={calculations.costoCatadura} isCurrency />

                        <NumberInput name="pesoBrutoEnvio" label="Peso Bruto Envío" value={formData.pesoBrutoEnvio} onChange={handleInputChange} />
                        <CalculatedField label="Diferencia" value={calculations.diferencia} />
                        <div className="md:col-span-2" />

                        <div className="md:col-span-2 pt-4 border-t border-border">
                            <NumberInput name="trillado" label="Trillado" value={formData.trillado} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-2 pt-4 border-t border-border">
                           <NumberInput name="enBodega" label="En Bodega" value={formData.enBodega} onChange={handleInputChange} />
                        </div>

                        <div className="md:col-span-2">
                             <label htmlFor="reciboDevuelto" className="block text-sm font-medium text-muted-foreground">Recibo devuelto</label>
                            <select id="reciboDevuelto" name="reciboDevuelto" value={String(formData.reciboDevuelto)} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                               <option value="false">No</option>
                               <option value="true">Sí</option>
                            </select>
                        </div>
                         <div className="md:col-span-4">
                            <label htmlFor="notas" className="block text-sm font-medium text-muted-foreground">Notas</label>
                            <textarea id="notas" name="notas" value={formData.notas} onChange={handleInputChange} rows={3} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border" />
                        </div>
                    </FormSection>

                </form>
                 <div className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-border">
                    <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                    <button type="submit" onClick={handleSubmit} disabled={!canSave} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
                        {isSaving ? 'Guardando...' : 'Guardar Recibo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptForm;