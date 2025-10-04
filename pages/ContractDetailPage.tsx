import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Contract, ContractLot, Exporter } from '../types';
import AddContractLotForm from '../components/AddContractLotForm';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

interface ContractDetailPageProps {
  contract: Contract;
  onBack: () => void;
}

const ContractDetailPage: React.FC<ContractDetailPageProps> = ({ contract, onBack }) => {
  const [lots, setLots] = useState<ContractLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [exporter, setExporter] = useState<Exporter | null>(null);

  useEffect(() => {
    const q = query(collection(db, "contractLots"), where("contractId", "==", contract.id));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const lotsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContractLot));
      setLots(lotsData);
      setLoadingLots(false);
    }, (error) => {
      console.error("Error fetching contract lots: ", error);
      setLoadingLots(false);
    });

    const fetchExporter = async () => {
        // In a real app, you would fetch this from Firestore using contract.exporterId
        // For now, we'll create a mock based on the name
        const mockExporter = { id: contract.exporterId, name: contract.exporterName, licenseNumber: contract.exporterName.includes('Dizano') ? '988' : '44360' };
        setExporter(mockExporter);
    }
    fetchExporter();

    return () => unsubscribe();
  }, [contract.id, contract.exporterId, contract.exporterName]);

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="text-sm font-medium text-green-600 hover:underline">
        &larr; Volver a Contratos
      </button>

      {/* Contract Summary */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Contrato: {contract.contractNumber}</h2>
                <p className="text-muted-foreground">{contract.buyerName}</p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${contract.isFinished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {contract.isFinished ? 'Terminado' : 'Activo'}
            </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
            <div><p className="text-muted-foreground">Exportadora</p><p className="font-medium text-foreground">{contract.exporterName}</p></div>
            <div><p className="text-muted-foreground">Fecha Venta</p><p className="font-medium text-foreground">{contract.saleDate}</p></div>
            <div><p className="text-muted-foreground">Cantidad Total</p><p className="font-medium text-foreground">{contract.quantity.toFixed(2)} qqo</p></div>
            <div><p className="text-muted-foreground">Diferencial</p><p className="font-medium text-foreground">${contract.differential.toFixed(2)}</p></div>
        </div>
      </div>
      
      {/* Add New Lot Form */}
      {exporter && <AddContractLotForm contract={contract} exporter={exporter} existingLots={lots} />}

      {/* Lots Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Partidas del Contrato</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-muted-foreground">
            <thead className="text-xs uppercase bg-muted">
              <tr>
                <th className="px-4 py-2">Partida</th>
                <th className="px-4 py-2">Bultos</th>
                <th className="px-4 py-2">Peso (Kg)</th>
                <th className="px-4 py-2">Peso (qqs)</th>
                <th className="px-4 py-2">Fijación</th>
                <th className="px-4 py-2">Destino</th>
                <th className="px-4 py-2">Muestra Aprob.</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingLots ? (
                <tr><td colSpan={8} className="text-center py-10">Cargando partidas...</td></tr>
              ) : lots.length > 0 ? (
                lots.map(lot => (
                  <tr key={lot.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{lot.partida}</td>
                    <td className="px-4 py-3">{lot.bultos}</td>
                    <td className="px-4 py-3">{lot.pesoKg.toFixed(2)}</td>
                    <td className="px-4 py-3">{lot.pesoQqs.toFixed(2)}</td>
                    <td className="px-4 py-3">${lot.fijacion.toFixed(2)}</td>
                    <td className="px-4 py-3">{lot.destino}</td>
                    <td className="px-4 py-3">{lot.muestraAprobada ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-4">
                            <button className="text-yellow-500 hover:text-yellow-700"><PencilIcon className="w-4 h-4" /></button>
                            <button className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="text-center py-10">No hay partidas para este contrato. ¡Agrega la primera!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractDetailPage;
