import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Contract, ContractStatus } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';


const getStatusClass = (status: ContractStatus) => {
    switch (status) {
        case ContractStatus.ACTIVE:
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case ContractStatus.COMPLETED:
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case ContractStatus.DRAFT:
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case ContractStatus.CANCELLED:
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

interface ContractsPageProps {
  onCreateContractClick: () => void;
}

const ContractsPage: React.FC<ContractsPageProps> = ({ onCreateContractClick }) => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, "contracts"), 
            (querySnapshot) => {
                const contractsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
                setContracts(contractsData);
                setLoading(false);
            }, 
            (error) => {
                console.error("Error fetching contracts: ", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Contratos</h2>
                <button 
                    onClick={onCreateContractClick}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                    <PlusIcon className="w-4 h-4" />
                    Crear Contrato
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">No. Contrato</th>
                            <th scope="col" className="px-6 py-3">Comprador</th>
                            <th scope="col" className="px-6 py-3">Fecha Contrato</th>
                            <th scope="col" className="px-6 py-3">Tipo Café</th>
                            <th scope="col" className="px-6 py-3 text-right">Cantidad (qqo)</th>
                            <th scope="col" className="px-6 py-3 text-right">Diferencial</th>
                            <th scope="col" className="px-6 py-3 text-center">Estado</th>
                            <th scope="col" className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-10">Cargando contratos...</td>
                            </tr>
                        ) : contracts.length > 0 ? (
                            contracts.map((contract) => (
                                <tr key={contract.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium text-foreground">{contract.contractNumber}</td>
                                    <td className="px-6 py-4 text-foreground">{contract.buyerName}</td>
                                    <td className="px-6 py-4">{contract.contractDate}</td>
                                    <td className="px-6 py-4">{contract.coffeeType}</td>
                                    <td className="px-6 py-4 text-right">{contract.quantity.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">${contract.differential.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(contract.status)}`}>
                                            {contract.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-4">
                                            <button className="text-yellow-500 hover:text-yellow-700">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan={8} className="text-center py-10">
                                    No hay contratos para mostrar. ¡Crea el primero!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ContractsPage;