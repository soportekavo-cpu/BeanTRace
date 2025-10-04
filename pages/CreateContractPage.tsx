import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Contract, ContractStatus, Exporter, Buyer } from '../types';
import CheckIcon from '../components/icons/CheckIcon';

interface CreateContractPageProps {
  onCancel: () => void;
  onSaveSuccess: () => void;
}

const InputField: React.FC<{ label: string, id: string, type?: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, placeholder?: string }> = 
({ label, id, type = 'text', value, onChange, required = true, placeholder }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="appearance-none block w-full px-3 py-2 border border-input bg-background placeholder-muted-foreground text-foreground rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
    />
  </div>
);

const CreateContractPage: React.FC<CreateContractPageProps> = ({ onCancel, onSaveSuccess }) => {
  const [contractNumber, setContractNumber] = useState('');
  const [exporterId, setExporterId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [coffeeType, setCoffeeType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [position, setPosition] = useState('');
  const [differential, setDifferential] = useState('');
  const [priceUnit, setPriceUnit] = useState<'CTS/LB' | '46 Kg.'>('CTS/LB');
  const [shipmentMonth, setShipmentMonth] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const [certifications, setCertifications] = useState<string[]>([]);
  
  const [exporters, setExporters] = useState<Exporter[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExportersAndBuyers = async () => {
      try {
        const exportersSnapshot = await getDocs(collection(db, "exporters"));
        setExporters(exportersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exporter)));
        const buyersSnapshot = await getDocs(collection(db, "buyers"));
        setBuyers(buyersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Buyer)));
      } catch (err) {
        console.error("Failed to fetch exporters or buyers: ", err);
        setError("No se pudieron cargar las exportadoras o compradores.");
      }
    };
    fetchExportersAndBuyers();
  }, []);

  const handleCertificationToggle = (cert: string) => {
    setCertifications(prev => 
        prev.includes(cert) 
        ? prev.filter(c => c !== cert) 
        : [...prev, cert]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractNumber || !exporterId || !buyerId || !quantity || !differential) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const selectedExporter = exporters.find(s => s.id === exporterId);
      const selectedBuyer = buyers.find(b => b.id === buyerId);

      if (!selectedExporter || !selectedBuyer) {
        throw new Error("Exportadora o comprador no válido.");
      }
      
      const newContract: Omit<Contract, 'id' | 'status'> = {
        contractNumber,
        exporterId,
        exporterName: selectedExporter.name,
        buyerId,
        buyerName: selectedBuyer.name,
        saleDate,
        coffeeType,
        quantity: parseFloat(quantity),
        position,
        differential: parseFloat(differential),
        priceUnit,
        shipmentMonth,
        isFinished,
        certifications,
      };

      await addDoc(collection(db, 'contracts'), {
        ...newContract,
        status: isFinished ? ContractStatus.COMPLETED : ContractStatus.DRAFT
      });
      onSaveSuccess();

    } catch (err) {
      console.error("Error creating contract: ", err);
      setError('No se pudo guardar el contrato. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const allCertifications = ['Rainforest', 'Orgánico', 'Fairtrade', 'EUDR'];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-green-600 dark:text-green-500">Crear Nuevo Contrato</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Details */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Información Principal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Número de Contrato" id="contractNumber" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
            <InputField label="Fecha de Venta" id="saleDate" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            
            <div>
              <label htmlFor="exporterId" className="block text-sm font-medium text-muted-foreground mb-1">Exportadora</label>
              <select id="exporterId" value={exporterId} onChange={(e) => setExporterId(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm">
                <option value="" disabled>Selecciona una exportadora</option>
                {exporters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="buyerId" className="block text-sm font-medium text-muted-foreground mb-1">Comprador</label>
              <select id="buyerId" value={buyerId} onChange={(e) => setBuyerId(e.target.value)} required className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm">
                <option value="" disabled>Selecciona un comprador</option>
                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Detalles del Café y Precio</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <InputField label="Tipo de Café" id="coffeeType" value={coffeeType} onChange={(e) => setCoffeeType(e.target.value)} placeholder="Ej: SHB, Natural" />
            <InputField label="Cantidad (qqo)" id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.00" />
            <InputField label="Posición (Mes Mercado)" id="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej: Julio" />
            <InputField label="Diferencial ($)" id="differential" type="number" value={differential} onChange={(e) => setDifferential(e.target.value)} placeholder="Ej: 10, -15" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 mt-8 items-start">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Unidad de Precio</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPriceUnit('CTS/LB')} className={`px-4 py-2 text-sm rounded-md w-24 text-center border-2 transition-colors ${priceUnit === 'CTS/LB' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-card hover:bg-muted/50 border-border'}`}>CTS/LB</button>
                <button type="button" onClick={() => setPriceUnit('46 Kg.')} className={`px-4 py-2 text-sm rounded-md w-24 text-center border-2 transition-colors ${priceUnit === '46 Kg.' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-card hover:bg-muted/50 border-border'}`}>46 Kg.</button>
              </div>
            </div>
            <div className="md:col-start-2">
                 <InputField label="Mes de Embarque" id="shipmentMonth" value={shipmentMonth} onChange={(e) => setShipmentMonth(e.target.value)} placeholder="Ej: Agosto" />
            </div>
             <div className="mt-2 col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Certificaciones del Contrato</label>
                <div className="flex flex-wrap gap-3">
                    {allCertifications.map(cert => {
                        const isSelected = certifications.includes(cert);
                        return (
                            <button
                                type="button"
                                key={cert}
                                onClick={() => handleCertificationToggle(cert)}
                                className={`flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full border-2 transition-colors text-sm font-semibold ${
                                    isSelected
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                                        : 'bg-card hover:bg-muted/50 dark:hover:bg-muted/20 border-border'
                                }`}
                            >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500' : 'bg-muted border border-border'}`}>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </span>
                                {cert}
                            </button>
                        )
                    })}
                </div>
           </div>
          </div>
        </div>
        
        {/* Status & Documents */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
           <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Estado y Documentos</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                        <p className="font-medium text-foreground">Contrato Terminado</p>
                        <p className="text-sm text-muted-foreground">Indica si el contrato se ha completado.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isFinished} onChange={() => setIsFinished(!isFinished)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-ring dark:bg-secondary peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                 <div>
                  <label htmlFor="contractPdf" className="block text-sm font-medium text-muted-foreground mb-1">PDF Contrato</label>
                  <input type="file" id="contractPdf" accept=".pdf" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/50 dark:file:text-green-300 dark:hover:file:bg-green-900"/>
                </div>
                <div>
                  <label htmlFor="instructionsPdf" className="block text-sm font-medium text-muted-foreground mb-1">PDF Instrucciones</label>
                  <input type="file" id="instructionsPdf" accept=".pdf" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/50 dark:file:text-green-300 dark:hover:file:bg-green-900"/>
                </div>
           </div>
        </div>

        {error && <p className="text-sm text-center text-red-500">{error}</p>}

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
          <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed">
            {loading ? 'Guardando...' : 'Guardar Contrato'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateContractPage;