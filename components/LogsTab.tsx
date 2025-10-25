

import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/localStorageManager';
import { Log, AppUser } from '../types';

const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const ActionBadge: React.FC<{ action: Log['action'] }> = ({ action }) => {
    const styles: Record<Log['action'], string> = {
        'CREACIÓN': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'MODIFICACIÓN': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'ANULACIÓN': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'ELIMINACIÓN': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[action]}`}>{action}</span>;
}

const LogsTab: React.FC = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [filters, setFilters] = useState({ userEmail: '', startDate: '', endDate: '' });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const [logsData, usersData] = await Promise.all([
                api.getCollection<Log>('logs'),
                api.getCollection<AppUser>('users'),
            ]);
            setLogs(logsData); // Assumes they are sorted descending from the source
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching logs: ", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchLogs();
        const handleDataChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (['logs', 'users'].includes(customEvent.detail.collectionName)) {
                fetchLogs();
            }
        };
        api.addDataChangeListener(handleDataChange);
        return () => api.removeDataChangeListener(handleDataChange);
    }, []);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const userMatch = !filters.userEmail || log.userEmail === filters.userEmail;
            const startDateMatch = !filters.startDate || logDate >= new Date(filters.startDate);
            const endDateMatch = !filters.endDate || logDate <= new Date(filters.endDate + 'T23:59:59');
            return userMatch && startDateMatch && endDateMatch;
        });
    }, [logs, filters]);

    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b">
                <select name="userEmail" value={filters.userEmail} onChange={handleFilterChange} className="px-3 py-2 border border-input bg-background rounded-md sm:text-sm">
                    <option value="">Todos los Usuarios</option>
                    {users.map(u => <option key={u.id} value={u.email}>{u.email}</option>)}
                </select>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="px-3 py-2 border border-input bg-background rounded-md sm:text-sm" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="px-3 py-2 border border-input bg-background rounded-md sm:text-sm" />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fecha y Hora</th>
                            <th scope="col" className="px-6 py-3">Usuario</th>
                            <th scope="col" className="px-6 py-3">Acción</th>
                            <th scope="col" className="px-6 py-3">Módulo</th>
                            <th scope="col" className="px-6 py-3">Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-10">Cargando bitácora...</td></tr>
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{log.userEmail}</td>
                                    <td className="px-6 py-4"><ActionBadge action={log.action} /></td>
                                    <td className="px-6 py-4">{log.module}</td>
                                    <td className="px-6 py-4">{log.description}</td>
                                </tr>
                            ))
                        ) : (
                             <tr><td colSpan={5} className="text-center py-10">No hay registros que coincidan con los filtros.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LogsTab;