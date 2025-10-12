import React from 'react';
import { PurchaseReceipt, Mezcla, Salida } from '../../../types';
import { formatNumber } from '../../../utils/formatting';

type ActivityItem = {
    type: 'ingreso' | 'mezcla' | 'salida';
    item: PurchaseReceipt | Mezcla | Salida;
}

interface ActivityDetailModalProps {
    item: ActivityItem['item'];
    type: ActivityItem['type'];
    onClose: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode; }> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-2 py-2 border-b">
        <span className="text-muted-foreground">{label}</span>
        <span className="col-span-2 font-medium text-foreground">{value}</span>
    </div>
);

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ item, type, onClose }) => {
    
    const renderContent = () => {
        switch(type) {
            case 'ingreso': {
                const receipt = item as PurchaseReceipt;
                return (
                    <>
                        <h3 className="text-lg font-bold text-green-600 mb-4">Ingreso: {receipt.recibo}</h3>
                        <DetailRow label="Fecha" value={formatDate(receipt.fecha)} />
                        <DetailRow label="Tipo de Café" value={receipt.tipo === 'Otro' ? receipt.customTipo : receipt.tipo} />
                        <DetailRow label="Peso Neto" value={`${formatNumber(receipt.pesoNeto)} qqs.`} />
                        <DetailRow label="En Bodega" value={`${formatNumber(receipt.enBodega)} qqs.`} />
                    </>
                );
            }
            case 'mezcla': {
                const mezcla = item as Mezcla;
                 return (
                    <>
                        <h3 className="text-lg font-bold text-purple-600 mb-4">Mezcla: {mezcla.mezclaNumber}</h3>
                        <DetailRow label="Fecha" value={formatDate(mezcla.creationDate)} />
                        <DetailRow label="Tipo de Mezcla" value={mezcla.tipoMezcla} />
                        <DetailRow label="Total Creado" value={`${formatNumber(mezcla.totalInputWeight)} qqs.`} />
                        <DetailRow label="En Bodega" value={`${formatNumber(mezcla.sobranteEnBodega)} qqs.`} />
                    </>
                );
            }
            case 'salida': {
                const salida = item as Salida;
                 return (
                    <>
                        <h3 className="text-lg font-bold text-blue-600 mb-4">Salida: {salida.salidaNumber}</h3>
                        <DetailRow label="Fecha" value={formatDate(salida.fecha)} />
                        <DetailRow label="Destino" value={salida.clienteName} />
                        <DetailRow label="Tipo" value={salida.tipoSalida} />
                        <DetailRow label="Peso Neto" value={`${formatNumber(salida.pesoNeto)} qqs.`} />
                    </>
                );
            }
            default: return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="space-y-2 text-sm">
                    {renderContent()}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default ActivityDetailModal;