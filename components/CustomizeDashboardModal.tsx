
import React, { useState } from 'react';
import { WidgetKey } from '../pages/DashboardPage';
import CheckIcon from './icons/CheckIcon';

interface CustomizeDashboardModalProps {
    allWidgets: Record<WidgetKey, { name: string; component: React.FC<any> }>;
    visibleWidgets: WidgetKey[];
    onSave: (widgets: WidgetKey[]) => void;
    onClose: () => void;
}

const CustomizeDashboardModal: React.FC<CustomizeDashboardModalProps> = ({ allWidgets, visibleWidgets, onSave, onClose }) => {
    const [selectedWidgets, setSelectedWidgets] = useState<Set<WidgetKey>>(new Set(visibleWidgets));

    const handleToggle = (key: WidgetKey) => {
        setSelectedWidgets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(Array.from(selectedWidgets));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-foreground mb-4">Personalizar Dashboard</h3>
                <p className="text-sm text-muted-foreground mb-6">Selecciona los módulos de información que quieres ver en tu dashboard.</p>
                <div className="space-y-3">
                    {/* FIX: Refactored to iterate over keys to resolve type inference issue with Object.entries. */}
                    {(Object.keys(allWidgets) as WidgetKey[]).map((key) => {
                        const widgetInfo = allWidgets[key];
                        const isSelected = selectedWidgets.has(key);
                        return (
                             <button
                                key={key}
                                onClick={() => handleToggle(key)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                                    isSelected
                                        ? 'bg-green-500/10 border-green-500 text-green-600'
                                        : 'bg-muted/50 border-border hover:border-gray-400'
                                }`}
                            >
                                <span className="font-semibold">{widgetInfo.name}</span>
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-green-500' : 'bg-background border border-border'}`}>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
};

export default CustomizeDashboardModal;