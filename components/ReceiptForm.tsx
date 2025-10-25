

import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { PurchaseReceipt, Supplier, CuppingProfile, CoffeeType, Exporter, NotificationSetting } from '../types';
import { useAuth } from '../contexts/AuthContext';
import CheckIcon from './icons/CheckIcon';
import { printComponent } from '../utils/printUtils';
import ReceiptPDF from './ReceiptPDF';
import ToggleSwitch from './ToggleSwitch';
import { useToast } from '../hooks/useToast';
import TrashIcon from './icons/TrashIcon';

interface ReceiptFormProps {
    existingReceipt?: PurchaseReceipt | null;
    suppliers: Supplier[];
    onCancel: () => void;
    onSaveSuccess: (savedReceipt: PurchaseReceipt) => void;
}

const allCertifications = ['Rainforest', 'Orgánico', 'Fairtrade', 'EUDR'];
const roastLevels: CuppingProfile['roastLevel'][] = ['', 'Ligero', 'Medio', 'Oscuro'];

const FormSection: React.FC<{ title: string; colorClass: string; children: React.ReactNode }> = ({ title, colorClass, children }) => (
    <div className="pt-6">
        <h3 className={`text-lg font-semibold ${colorClass} mb-4 border-b border-border pb-3`}>{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-x-6 gap-y-4">
            {children}
        </div>
    </div>
);


const TextInput: React.FC<{ name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; placeholder?: string; parent?: string; isTextArea?: boolean; className?: string }> = ({ name, label, value, onChange, placeholder, parent, isTextArea, className = '' }) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{label}</label>
        {isTextArea ? (
             <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} data-parent={parent} rows={3} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border focus:ring-green-500 focus:border-green-500" />
        ) : (
            <input type="text" id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} data-parent={parent} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border focus:ring-green-500 focus:border-green-500" />
        )}
    </div>
);

const NumberInput: React.FC<{ name: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string; placeholder?: string; disabled?: boolean; parent?: string; min?: string; max?: string; className?: string; required?: boolean; }> = ({ name, label, value, onChange, step = "any", placeholder, disabled = false, parent, min, max, className = '', required = false }) => (
    <div className={className}>
        <label htmlFor={name} className="block text-sm font-medium text-muted-foreground">{label}</label>
        <input type="number" id={name} name={name} value={value} onChange={onChange} step={step} placeholder={placeholder} disabled={disabled} data-parent={parent} min={min} max={max} required={required} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border focus:ring-green-500 focus:border-green-500 disabled:bg-muted disabled:cursor-not-allowed" />
    </div>
);

const CalculatedField: React.FC<{ label: string, value: number | string, isPercentage?: boolean, isCurrency?: boolean, className?: string, valueClassName?: string }> = ({ label, value, isPercentage, isCurrency, className = '', valueClassName = '' }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-muted-foreground">{label}</label>
        <div className={`mt-1 w-full p-2 font-semibold bg-muted/50 rounded-md min-h-[42px] flex items-center ${valueClassName || 'text-foreground'}`}>
            {typeof value === 'number'
                ? `${isCurrency ? 'Q' : ''}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${isPercentage ? '%' : ''}`
                : value
            }
        </div>
    </div>
);


const ReceiptForm: React.FC<ReceiptFormProps> = ({ existingReceipt, suppliers, onCancel, onSaveSuccess }) => {
    const { user, roleDetails } = useAuth();
    const isEditMode = !!existingReceipt;
    const canViewCosts = roleDetails?.permissions.ingreso?.viewCosts === true;
    const canViewAnalysis = roleDetails?.permissions.ingreso?.viewAnalysis === true;
    const [coffeeTypes, setCoffeeTypes] = useState<CoffeeType[]>([]);
    const { addToast } = useToast();

    const getInitialState = () => {
         const cuppingInitial = {
            humedad: '',
            dictamen: '',
            diferencial: '',
            mezcla: '',
            roastLevel: '',
            cuppingDate: new Date().toISOString().split('T')[0],
            notes: '',
        };

        return {
            certificacion: existingReceipt?.certificacion || [],
            fecha: existingReceipt?.fecha || new Date().toISOString().split('T')[0],
            recibo: existingReceipt?.recibo || '',
            proveedorId: existingReceipt?.proveedorId || '',
            placaVehiculo: existingReceipt?.placaVehiculo || '',
            piloto: existingReceipt?.piloto || '',
            tipo: existingReceipt?.tipo || '',
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
            pesoNetoEnvio: existingReceipt?.pesoNetoEnvio?.toString() || '',
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
    const [pdfEnvioFile, setPdfEnvioFile] = useState<{name: string, data: string} | null>(
        isEditMode && existingReceipt?.pdfEnvio ? { name: `Envio_${existingReceipt.recibo}.pdf`, data: existingReceipt.pdfEnvio } : null
    );
    
    useEffect(() => {
        const setReciboNumber = async () => {
            if (!isEditMode) {
                const allReceipts = await api.getCollection<PurchaseReceipt>('purchaseReceipts');
                const cReceipts = allReceipts.filter(r => r.recibo.startsWith('C-'));
                const maxNum = cReceipts.reduce((max, r) => {
                    const num = parseInt(r.recibo.split('-')[1]);
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0);
                const nextId = maxNum + 1;
                setFormData((prev: any) => ({ ...prev, recibo: `C-${nextId}` }));
            }
        };
        const fetchCoffeeTypes = async () => {
            const types = await api.getCollection<CoffeeType>('coffeeTypes');
            setCoffeeTypes(types);
            if (!isEditMode && types.length > 0) {
                 setFormData((prev: any) => ({ ...prev, tipo: types[0].tipo }));
            }
        }
        setReciboNumber();
        fetchCoffeeTypes();
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
        const pesoNetoEnvio = parseFloat(formData.pesoNetoEnvio) || 0;
        
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
        const diferencia = pesoNetoEnvio - pesoNeto;

        return { taraSugerida, tara, pesoNeto, primera, rechazo, totalBruto, rendimientoTotal, rendimientoPrimera, rendimientoRechazo, totalCompra, costoCatadura, diferencia };
    }, [formData, isTaraOverridden]);

    useEffect(() => {
        if (!isTaraOverridden) {
            setFormData((prev: any) => ({...prev, tara: calculations.taraSugerida.toFixed(2)}));
        }
    }, [calculations.taraSugerida, isTaraOverridden]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
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
        
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().split(',')[1];
                if (base64String) {
                    setPdfEnvioFile({ name: file.name, data: base64String });
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ''; // Allow re-uploading same file
    };

    const handleCertificationToggle = (cert: string) => {
        setFormData((prev: any) => ({
            ...prev,
            certificacion: prev.certificacion.includes(cert)
                ? prev.certificacion.filter((c: string) => c !== cert)
                : [...prev.certificacion, cert]
        }));
    };
    
    const triggerNotificationSimulation = async (receipt: PurchaseReceipt) => {
        try {
            const settings = await api.getCollection<NotificationSetting>('notifications', s => s.event === 'new-receipt');
            if (settings.length > 0 && settings[0].emails) {
                addToast(`Simulación de Notificación: Correo enviado a ${settings[0].emails} por el nuevo recibo ${receipt.recibo}.`, 'info');
            }
        } catch (error) {
            console.error("Failed to check for notification settings:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.proveedorId) {
            addToast("Por favor, selecciona un proveedor.", "error");
            return;
        }
        if (!formData.pesoNetoEnvio) {
            addToast("El campo 'Peso Neto Envío' es obligatorio.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const finalTrillado = existingReceipt?.trillado || 0;
            const finalEnBodega = calculations.pesoNeto - finalTrillado;

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
                pesoNetoEnvio: parseFloat(formData.pesoNetoEnvio) || 0,
                trillado: finalTrillado,
                enBodega: finalEnBodega,
                pdfEnvio: pdfEnvioFile?.data,
                cuppingProfile: {
                    humedad: parseFloat(formData.cuppingProfile.humedad) || undefined,
                    diferencial: parseFloat(formData.cuppingProfile.diferencial) || undefined,
                    dictamen: formData.cuppingProfile.dictamen,
                    mezcla: formData.cuppingProfile.mezcla,
                    roastLevel: formData.cuppingProfile.roastLevel,
                    cuppingDate: formData.cuppingProfile.cuppingDate,
                    notes: formData.cuppingProfile.notes,
                },
            };
            
            let savedReceipt;
            if (isEditMode) {
                savedReceipt = await api.updateDocument<PurchaseReceipt>('purchaseReceipts', existingReceipt.id, finalData);
            } else {
                savedReceipt = await api.addDocument<PurchaseReceipt>('purchaseReceipts', finalData);
                await triggerNotificationSimulation(savedReceipt);
            }
            
            const selectedSupplier = suppliers.find(s => s.id === savedReceipt.proveedorId);
            if (selectedSupplier) {
                const exporters = await api.getCollection<Exporter>('exporters');
                const dizano = exporters.find(e => e.name === 'Dizano, S.A.');
                printComponent(
                    <ReceiptPDF receipt={savedReceipt} supplier={selectedSupplier} exporterLogo={dizano?.logo} />,
                    `Recibo-${savedReceipt.recibo}`
                );
            }

            onSaveSuccess(savedReceipt);
        } catch (error) {
            console.error("Error saving receipt:", error);
            addToast("Error al guardar el recibo.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = formData.proveedorId && formData.pesoNetoEnvio && !isSaving;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center p-4">
            <div className="bg-card rounded-lg shadow-xl max-w-6xl w-full h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 border-b border-border">
                    <h2 className="text-2xl font-bold text-foreground">{isEditMode ? `Editar Recibo N.° ${formData.recibo}` : 'Nuevo Recibo de Ingreso'}</h2>
                </header>
                
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto px-6 space-y-4">
                    
                    <FormSection title="Información General" colorClass="text-blue-600">
                        <CalculatedField label="Recibo N.°" value={formData.recibo} valueClassName="text-red-600 dark:text-red-500" className="md:col-span-1" />
                         <div className="md:col-span-1">
                            <label htmlFor="fecha" className="block text-sm font-medium text-muted-foreground">Fecha</label>
                            <input type="date" id="fecha" name="fecha" value={formData.fecha} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="proveedorId" className="block text-sm font-medium text-muted-foreground">Proveedor *</label>
                            <select id="proveedorId" name="proveedorId" value={formData.proveedorId} onChange={handleInputChange} required className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                                <option value="">Seleccionar</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                         <div className="md:col-span-2 md:row-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Certificación</label>
                            <div className="flex flex-col space-y-2">
                                {allCertifications.map(cert => {
                                    const isSelected = formData.certificacion.includes(cert);
                                    return (
                                        <button
                                            type="button"
                                            key={cert}
                                            onClick={() => handleCertificationToggle(cert)}
                                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border-2 transition-colors text-sm font-semibold w-full justify-start ${
                                                isSelected
                                                    ? 'bg-green-500/10 border-green-500 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                                                    : 'bg-card hover:bg-muted/50 dark:hover:bg-muted/20 border-border'
                                            }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-green-500' : 'bg-muted border border-border'}`}>
                                                {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                            </span>
                                            {cert}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <TextInput name="placaVehiculo" label="Placa del Vehículo" value={formData.placaVehiculo} onChange={handleInputChange} className="md:col-span-2" />
                        <TextInput name="piloto" label="Piloto" value={formData.piloto} onChange={handleInputChange} className="md:col-span-2" />
                    </FormSection>

                    <FormSection title="Detalle del Café y Pesos" colorClass="text-purple-600">
                         <div className="md:col-span-2">
                            <label htmlFor="tipo" className="block text-sm font-medium text-muted-foreground">Tipo de Café</label>
                            <select id="tipo" name="tipo" value={formData.tipo} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                                {coffeeTypes.map(t => <option key={t.id} value={t.tipo}>{t.tipo}</option>)}
                            </select>
                        </div>
                        <NumberInput name="pesoBruto" label="Peso Bruto" value={formData.pesoBruto} onChange={handleInputChange} className="md:col-span-1" />
                        <NumberInput name="yute" label="Yute (sacos)" value={formData.yute} onChange={handleInputChange} step="1" className="md:col-span-1" />
                        <NumberInput name="nylon" label="Nylon (Sacos)" value={formData.nylon} onChange={handleInputChange} step="1" className="md:col-span-1" />
                        <div className="relative md:col-span-1">
                            <NumberInput name="tara" label="Tara" value={formData.tara} onChange={handleInputChange} disabled={!isTaraOverridden} />
                            {user?.role === 'Admin' && (
                                <div className="absolute top-1 right-1 flex items-center space-x-1">
                                    <label htmlFor="taraOverride" className="text-xs text-muted-foreground">Manual</label>
                                    <input id="taraOverride" type="checkbox" checked={isTaraOverridden} onChange={(e) => setIsTaraOverridden(e.target.checked)} className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
                                </div>
                            )}
                        </div>
                        <CalculatedField label="Peso Neto" value={calculations.pesoNeto} valueClassName="font-bold text-purple-600 dark:text-purple-400" className="md:col-span-2" />
                        <NumberInput name="pesoNetoEnvio" label="Peso Neto Envío *" value={formData.pesoNetoEnvio} onChange={handleInputChange} required className="md:col-span-2"/>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground">Diferencia</label>
                            <div className={`mt-1 w-full p-2 font-semibold bg-muted/50 rounded-md min-h-[42px] flex items-center ${calculations.diferencia < -0.005 ? 'text-red-500' : 'text-green-600'}`}>
                                {calculations.diferencia.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="md:col-span-6">
                            <label htmlFor="pdfEnvio" className="block text-sm font-medium text-muted-foreground">PDF Envío</label>
                            {!pdfEnvioFile ? (
                                <input type="file" id="pdfEnvio" accept=".pdf" onChange={handleFileChange} className="mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/50 dark:file:text-green-300 dark:hover:file:bg-green-900"/>
                            ) : (
                                <div className="mt-1 flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <span className="text-sm text-foreground truncate">{pdfEnvioFile.name}</span>
                                    <button type="button" onClick={() => setPdfEnvioFile(null)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}
                        </div>
                    </FormSection>

                    {canViewAnalysis && (
                        <FormSection title="Análisis de Calidad y Rendimiento" colorClass="text-teal-600">
                            <NumberInput name="gMuestra" label="g Muestra" value={formData.gMuestra} onChange={handleInputChange} step="1" className="md:col-span-1" />
                            <NumberInput name="gPrimera" label="g Primera" value={formData.gPrimera} onChange={handleInputChange} step="1" className="md:col-span-1" />
                            <NumberInput name="gRechazo" label="g Rechazo" value={formData.gRechazo} onChange={handleInputChange} step="1" className="md:col-span-1" />
                            <div className="md:col-span-3" />
                            <CalculatedField label="Primera" value={calculations.primera} valueClassName="font-bold text-purple-600 dark:text-purple-400" className="md:col-span-1" />
                            <CalculatedField label="Rechazo" value={calculations.rechazo} valueClassName="font-bold text-purple-600 dark:text-purple-400" className="md:col-span-1" />
                            <CalculatedField label="Total Bruto" value={calculations.totalBruto} valueClassName="font-bold text-purple-600 dark:text-purple-400" className="md:col-span-1" />
                            <div className="md:col-span-3" />
                            <CalculatedField label="% Rendimiento Total" value={calculations.rendimientoTotal} isPercentage className="md:col-span-2" />
                            <CalculatedField label="% Rendimiento de Primera" value={calculations.rendimientoPrimera} isPercentage className="md:col-span-2" />
                            <CalculatedField label="% Rendimiento de Rechazo" value={calculations.rendimientoRechazo} isPercentage className="md:col-span-2" />
                        </FormSection>
                    )}

                    {canViewAnalysis && (
                        <FormSection title="Perfil de Catación" colorClass="text-orange-600">
                            <NumberInput parent="cuppingProfile" name="humedad" label="Humedad (%)" value={formData.cuppingProfile.humedad} onChange={handleInputChange} min="0" max="100" className="md:col-span-1"/>
                            <TextInput parent="cuppingProfile" name="dictamen" label="Dictamen" value={formData.cuppingProfile.dictamen} onChange={handleInputChange} className="md:col-span-2" />
                            <NumberInput parent="cuppingProfile" name="diferencial" label="Diferencial" value={formData.cuppingProfile.diferencial} onChange={handleInputChange} className="md:col-span-1"/>
                            <TextInput parent="cuppingProfile" name="mezcla" label="Mezcla" value={formData.cuppingProfile.mezcla} onChange={handleInputChange} className="md:col-span-2" />
                            <div className="md:col-span-2">
                                <label htmlFor="roastLevel" className="block text-sm font-medium text-muted-foreground">Nivel de Tueste</label>
                                <select id="roastLevel" name="roastLevel" data-parent="cuppingProfile" value={formData.cuppingProfile.roastLevel} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border">
                                    {roastLevels.map(t => <option key={t} value={t}>{t || 'Seleccionar'}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="cuppingDate" className="block text-sm font-medium text-muted-foreground">Fecha de Catación</label>
                                <input type="date" id="cuppingDate" name="cuppingDate" data-parent="cuppingProfile" value={formData.cuppingProfile.cuppingDate} onChange={handleInputChange} className="mt-1 w-full p-2 border rounded-md bg-secondary border-border" />
                            </div>
                            <TextInput parent="cuppingProfile" name="notes" label="Notas del Catador" value={formData.cuppingProfile.notes} onChange={handleInputChange} isTextArea className="md:col-span-6"/>
                        </FormSection>
                    )}

                    {canViewCosts && (
                        <FormSection title="Costos" colorClass="text-red-600">
                            <NumberInput name="precio" label="Precio (Q)" value={formData.precio} onChange={handleInputChange} className="md:col-span-1"/>
                            <CalculatedField label="Total Compra (Q)" value={calculations.totalCompra} isCurrency className="md:col-span-2" />
                            <NumberInput name="precioCatadura" label="Precio Catadura (Q)" value={formData.precioCatadura} onChange={handleInputChange} className="md:col-span-1"/>
                            <CalculatedField label="Costo Catadura (Q)" value={calculations.costoCatadura} isCurrency className="md:col-span-2"/>
                        </FormSection>
                    )}

                    <FormSection title="Almacenamiento y Estado" colorClass="text-indigo-600">
                        <CalculatedField label="Trillado" value={existingReceipt?.trillado || 0} valueClassName="font-bold text-purple-600 dark:text-purple-400" className="md:col-span-3"/>
                        <CalculatedField label="En Bodega" value={calculations.pesoNeto - (existingReceipt?.trillado || 0)} valueClassName="font-bold text-purple-600 dark:text-purple-400" className="md:col-span-3"/>
                        <TextInput name="notas" label="Notas" value={formData.notas} onChange={handleInputChange} isTextArea className="md:col-span-6"/>
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