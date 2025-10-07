import React, { useState, useEffect } from 'react';
import api from '../services/localStorageManager';
import { Contract, Exporter, Buyer } from '../types';
import CheckIcon from './icons/CheckIcon';

interface EditContractFormProps {
    contract: Contract;
    onSave: (updatedContract: Contract) => void;
    onCancel: () => void;
}

const InputField: React.FC<{ label: string, id: string, type?: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, placeholder?: string }> = 
({ label, id, type = 'text', value, onChange, required = true, placeholder }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="appearance-none block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
    />
  </div>
);

const EditContractForm: React.FC<EditContractFormProps> = ({ contract, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Contract>(contract);
    const [exporters, setExporters] = useState<Exporter[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchExportersAndBuyers = async () => {
          try {
            const [exportersData, buyersData] = await Promise.all([
              api.getCollection<Exporter>('exporters'),
              api.getCollection<Buyer>('buyers')
            ]);
            setExporters(exportersData);
            setBuyers(buyersData);
          } catch (err) {
            console.error("Failed to fetch exporters or buyers: ", err);
          }
        };
        fetchExportersAndBuyers();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (name === 'exporterId') {
            const exporterName = exporters.find(exp => exp.id === value)?.name || '';
            setFormData(prev => ({ ...prev, exporterId: value, exporterName }));
            return;
        }
        if (name === 'buyerId') {
            const buyerName = buyers.find(b => b.id === value)?.name || '';
            setFormData(prev => ({ ...prev, buyerId: value, buyerName }));
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };
    
    const handleCertificationToggle = (cert: string) => {
        setFormData(prev => ({
            ...prev,
            certifications: prev.certifications.includes(cert)
                ? prev.certifications.filter(c => c !== cert)
                : [...prev.certifications, cert]
        }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const updatedContract = {
            ...formData,
            differential: parseFloat(String(formData.differential)),
        };
        await onSave(updatedContract);
        setIsSaving(false);
    };

    const allCertifications = ['Rainforest', 'Orgánico', 'Fairtrade', 'EUDR'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-foreground mb-4">Editar Contrato: {contract.contractNumber}</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Main Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Número de Contrato" id="contractNumber" value={formData.contractNumber} onChange={handleChange} />
                        <InputField label="Fecha de Venta" id="saleDate" type="date" value={formData.saleDate} onChange={handleChange} />
                        <div>
                            <label htmlFor="exporterId" className="block text-sm font-medium text-muted-foreground mb-1">Exportadora</label>
                            <select id="exporterId" name="exporterId" value={formData.exporterId} onChange={handleChange} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm">
                                {exporters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="buyerId" className="block text-sm font-medium text-muted-foreground mb-1">Comprador</label>
                            <select id="buyerId" name="buyerId" value={formData.buyerId} onChange={handleChange} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm">
                                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Coffee Details */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InputField label="Tipo de Café" id="coffeeType" value={formData.coffeeType} onChange={handleChange} placeholder="Ej: SHB, Natural" />
                        <InputField label="Posición (Mes Mercado)" id="position" value={formData.position} onChange={handleChange} placeholder="Ej: Julio" />
                        <InputField label="Diferencial ($)" id="differential" type="number" value={formData.differential} onChange={handleChange} placeholder="Ej: 10, -15" />
                    </div>
                    
                    {/* Certifications and status */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Certificaciones</label>
                             <div className="flex flex-wrap gap-3">
                                {allCertifications.map(cert => {
                                    const isSelected = formData.certifications.includes(cert);
                                    return (
                                        <button type="button" key={cert} onClick={() => handleCertificationToggle(cert)}
                                            className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border-2 transition-colors text-sm font-semibold ${
                                                isSelected ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-card hover:bg-muted/50 border-border'}`}>
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500' : 'bg-muted border border-border'}`}>
                                                {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                            </span>
                                            {cert}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                            <div>
                                <p className="font-medium text-foreground">Contrato Terminado</p>
                                <p className="text-sm text-muted-foreground">Indica si el contrato se ha completado.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="isFinished" checked={formData.isFinished} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-ring dark:bg-secondary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border flex gap-4">
                        <button type="button" className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Ver PDF Contrato</button>
                        <button type="button" className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Ver PDF Instrucciones</button>
                    </div>

                    <div className="flex justify-end gap-4">
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

export default EditContractForm;