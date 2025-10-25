

import React, { useState, useEffect } from 'react';
import api from '../services/localStorageManager';
import { NotificationSetting } from '../types';
import { useToast } from '../hooks/useToast';

const eventLabels: Record<NotificationSetting['event'], string> = {
    'new-receipt': 'Al crear un nuevo recibo',
    'new-salida': 'Al crear una nueva salida (envío)',
    'new-threshing-order': 'Al crear una nueva Orden de Trilla',
    'update-threshing-order': 'Al actualizar una Orden de Trilla',
    'void-threshing-order': 'Al anular una Orden de Trilla',
};

const NotificationsTab: React.FC = () => {
    const [settings, setSettings] = useState<NotificationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const data = await api.getCollection<NotificationSetting>('notifications');
                // Ensure all possible events are displayed
                const allEvents: NotificationSetting['event'][] = ['new-receipt', 'new-salida', 'new-threshing-order', 'update-threshing-order', 'void-threshing-order'];
                const displayedSettings = allEvents.map(event => {
                    const existing = data.find(s => s.event === event);
                    return existing || { id: `new-${event}`, event, emails: '' };
                });
                setSettings(displayedSettings);
            } catch (error) {
                console.error("Error fetching notification settings:", error);
                addToast("No se pudieron cargar las configuraciones de notificación.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleEmailChange = (idOrEvent: string, emails: string) => {
        setSettings(prev => prev.map(s => (s.id === idOrEvent || s.event === idOrEvent) ? { ...s, emails } : s));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const allSettings = await api.getCollection<NotificationSetting>('notifications');
            const updatePromises = settings.map(setting => {
                const existing = allSettings.find(s => s.event === setting.event);
                if (existing) {
                    return api.updateDocument<NotificationSetting>('notifications', existing.id, { emails: setting.emails });
                } else {
                    // This case is for newly added events that might not be in storage yet
                    return api.addDocument<NotificationSetting>('notifications', { event: setting.event, emails: setting.emails });
                }
            });
            await Promise.all(updatePromises);
            addToast("Configuraciones de notificación guardadas.", "success");
        } catch (error) {
            console.error("Error saving notification settings:", error);
            addToast("Error al guardar las configuraciones.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <p>Cargando configuraciones...</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-foreground">Configurar Alertas por Correo Electrónico</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Define qué direcciones de correo electrónico recibirán notificaciones cuando ocurran ciertos eventos en el sistema.
                    Separa múltiples correos con comas.
                </p>
            </div>

            <div className="space-y-4">
                {settings.map(setting => (
                    <div key={setting.id} className="p-4 border rounded-lg bg-muted/50">
                        <label htmlFor={setting.event} className="block text-sm font-medium text-foreground mb-2">
                            {eventLabels[setting.event]}
                        </label>
                        <input
                            id={setting.event}
                            type="text"
                            value={setting.emails}
                            onChange={(e) => handleEmailChange(setting.id, e.target.value)}
                            placeholder="ejemplo1@correo.com, ejemplo2@correo.com"
                            className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-ring focus:border-ring sm:text-sm"
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-6">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
};

export default NotificationsTab;