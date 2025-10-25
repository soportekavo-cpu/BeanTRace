import { 
    AppUser, AppRole, Exporter, Buyer, Supplier, Client, Contract, ContractLot, PurchaseReceipt,
    ThreshingOrder, ThreshingOrderReceipt, PagePermissions, CoffeeType, ByproductType, Rendimiento, Reproceso, Mezcla, Salida, Log,
    NotificationSetting
} from '../types';
import { DataService } from './dataService';

const generateId = () => Math.random().toString(36).substring(2, 15);

const allPermissions: PagePermissions = { view: true, add: true, edit: true, delete: true };
const viewOnlyPermissions: PagePermissions = { view: true, add: false, edit: false, delete: false };
const noPermissions: PagePermissions = { view: false, add: false, edit: false, delete: false };

const seedData = {
    users: [
        { id: '1', email: 'pruebaappcoffee@gmail.com', role: 'Admin', name: 'Yony' },
        { id: '2', email: 'manager@beantrace.com', role: 'Manager', name: 'Manager' },
        { id: '3', email: 'user@beantrace.com', role: 'User', name: 'User' },
    ],
    roles: [
        { 
            id: '1', name: 'Admin', isDefault: true,
            permissions: {
                dashboard: { ...allPermissions },
                'contracts-info': { ...allPermissions },
                'contracts-lots': { ...allPermissions, viewPrices: true },
                'contracts-threshing': { ...allPermissions },
                ventasLocales: { ...allPermissions },
                ingreso: { ...allPermissions, viewCosts: true, viewAnalysis: true },
                rendimientos: { ...allPermissions },
                reprocesos: { ...allPermissions, editEntrada: true, editSalida: true },
                mezclas: { ...allPermissions },
                salidas: { ...allPermissions },
                entities: { ...allPermissions },
                admin: { ...allPermissions },
                coffeeTypes: { ...allPermissions },
                byproducts: { ...allPermissions },
                trazabilidad: { ...allPermissions },
                logs: { ...allPermissions },
            }
        },
        { 
            id: '2', name: 'Manager', isDefault: false,
            permissions: {
                dashboard: { ...viewOnlyPermissions },
                'contracts-info': { view: true, add: true, edit: true, delete: false },
                'contracts-lots': { view: true, add: true, edit: true, delete: false, viewPrices: true },
                'contracts-threshing': { view: true, add: true, edit: true, delete: false },
                ventasLocales: { view: true, add: true, edit: true, delete: false },
                ingreso: { view: true, add: true, edit: true, delete: false, viewCosts: true, viewAnalysis: true },
                rendimientos: { view: true, add: true, edit: true, delete: false },
                reprocesos: { view: true, add: true, edit: true, delete: false, editEntrada: true, editSalida: true },
                mezclas: { view: true, add: true, edit: true, delete: false },
                salidas: { view: true, add: true, edit: true, delete: false },
                entities: { ...noPermissions },
                admin: { ...noPermissions },
                coffeeTypes: { ...viewOnlyPermissions },
                byproducts: { ...viewOnlyPermissions },
                trazabilidad: { ...viewOnlyPermissions },
                logs: { ...noPermissions },
            }
        },
        { 
            id: '3', name: 'User', isDefault: false,
            permissions: {
                dashboard: { ...noPermissions },
                'contracts-info': { ...noPermissions },
                'contracts-lots': { ...noPermissions },
                'contracts-threshing': { ...noPermissions },
                ventasLocales: { ...noPermissions },
                ingreso: { view: true, add: true, edit: false, delete: false, viewCosts: false, viewAnalysis: false },
                rendimientos: { ...noPermissions },
                reprocesos: { ...noPermissions },
                mezclas: { ...noPermissions },
                salidas: { ...noPermissions },
                entities: { ...noPermissions },
                admin: { ...noPermissions },
                coffeeTypes: { ...noPermissions },
                byproducts: { ...noPermissions },
                trazabilidad: { ...noPermissions },
                logs: { ...noPermissions },
            }
        },
    ],
    exporters: [
        { id: 'exp1', name: 'Dizano, S.A.', licenseNumber: '988' },
        { id: 'exp2', name: 'Proben, S.A.', licenseNumber: '44360' },
    ],
    buyers: [
        { id: 'buy1', name: 'Panamerican Coffee Trading', address: '', contactPerson: '', phone: '', email: '' },
        { id: 'buy2', name: 'Sucafina NA', address: '', contactPerson: '', phone: '', email: '' },
    ],
    suppliers: [
        { id: 'sup1', name: 'Alfonso Oliva', phone: '', email: '' },
        { id: 'sup2', name: 'Carlos Espina', phone: '', email: '' },
        { id: 'sup3', name: 'Francisco Medrano', phone: '', email: '' }
    ],
    clients: [
        { id: 'cli1', name: 'Cafetería El Gato Negro', phone: '555-2222', email: 'compras@gatonegro.com' }
    ],
    contracts: [],
    contractLots: [],
    purchaseReceipts: [],
    threshingOrders: [],
    threshingOrderReceipts: [],
    rendimientos: [],
    reprocesos: [],
    mezclas: [],
    salidas: [],
    coffeeTypes: [
        { id: 'ct1', tipo: 'Pergamino' },
        { id: 'ct2', tipo: 'Cereza' },
        { id: 'ct3', tipo: 'Oro Lavado' },
        { id: 'ct4', tipo: 'Oro Natural' },
    ],
    byproductTypes: [
        // Lavados
        { id: 'bpt3', tipo: 'L. 3ras. de Oliver' },
        { id: 'bpt11', tipo: 'L. Chibola' },
        { id: 'bpt7', tipo: 'L. Pozol' },
        { id: 'bpt1', tipo: 'L. Primeras' },
        { id: 'bpt5', tipo: 'L. Rechazo de Electrónica' },
        { id: 'bpt9', tipo: 'L. Zaranda 13' },
        // Naturales
        { id: 'bpt4', tipo: 'N. 3ras. de Oliver' },
        { id: 'bpt12', tipo: 'N. Chibola' },
        { id: 'bpt8', tipo: 'N. Pozol' },
        { id: 'bpt2', tipo: 'N. Primeras' },
        { id: 'bpt6', tipo: 'N. Rechazo de Electrónica' },
        { id: 'bpt10', tipo: 'N. Zaranda 13' },
    ],
    logs: [],
    notifications: [
        { id: 'notif1', event: 'new-receipt', emails: '' },
        { id: 'notif2', event: 'new-salida', emails: '' },
        { id: 'notif3', event: 'new-threshing-order', emails: '' },
        { id: 'notif4', event: 'update-threshing-order', emails: '' },
        { id: 'notif5', event: 'void-threshing-order', emails: '' },
    ]
};

const initializeDB = () => {
    Object.keys(seedData).forEach(key => {
        if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, JSON.stringify(seedData[key as keyof typeof seedData]));
        }
    });
};

initializeDB();

const emitter = new EventTarget();

const addDataChangeListener = (callback: EventListener) => {
    emitter.addEventListener('datachange', callback);
};

const removeDataChangeListener = (callback: EventListener) => {
    emitter.removeEventListener('datachange', callback);
};

const dispatchDataChange = (collectionName: string) => {
    emitter.dispatchEvent(new CustomEvent('datachange', { detail: { collectionName } }));
};

// --- LOGGING ---
const getCurrentUserEmail = (): string => {
    try {
        const storedUser = sessionStorage.getItem('authUser');
        if (storedUser) {
            return JSON.parse(storedUser).email;
        }
    } catch (e) {
        console.error("Could not get user for logging", e);
    }
    return 'Sistema'; // Fallback
};

const collectionToModuleMap: Record<string, string> = {
    contracts: 'Contratos (Exportación)',
    contractLots: 'Partidas de Contrato',
    purchaseReceipts: 'Ingreso de Café',
    threshingOrders: 'Órdenes de Trilla',
    rendimientos: 'Rendimientos',
    reprocesos: 'Reprocesos',
    mezclas: 'Mezclas',
    salidas: 'Salidas',
    users: 'Usuarios',
    roles: 'Roles',
    exporters: 'Exportadoras',
    buyers: 'Compradores',
    suppliers: 'Proveedores',
    clients: 'Clientes',
    coffeeTypes: 'Tipos de Café',
    byproductTypes: 'Tipos de Subproductos',
    notifications: 'Notificaciones',
};

const getDocIdentifier = (collectionName: string, doc: any): string => {
    switch(collectionName) {
        case 'contracts': return doc.contractNumber;
        case 'purchaseReceipts': return doc.recibo;
        case 'threshingOrders': return doc.orderNumber;
        case 'rendimientos': return doc.rendimientoNumber;
        case 'reprocesos': return doc.reprocesoNumber;
        case 'mezclas': return doc.mezclaNumber;
        case 'salidas': return doc.salidaNumber;
        case 'users': return doc.email;
        case 'roles': return doc.name;
        case 'contractLots': return doc.partida;
        case 'coffeeTypes': return doc.tipo;
        case 'byproductTypes': return doc.tipo;
        default: return doc.name || doc.id || 'ID desconocido';
    }
};

const addLogEntry = (userEmail: string, action: Log['action'], module: string, description: string) => {
    try {
        const logs = JSON.parse(localStorage.getItem('logs') || '[]') as Log[];
        const newLog: Log = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            userEmail,
            action,
            module,
            description,
        };
        logs.unshift(newLog); // Add to the beginning for recent first
        localStorage.setItem('logs', JSON.stringify(logs));
        dispatchDataChange('logs');
    } catch (e) {
        console.error("Failed to write log entry:", e);
    }
};

// --- API IMPLEMENTATION ---

const localStorageService: DataService = {
    generateId,
    getCollection: async <T>(collectionName: string, filterFn?: (item: any) => boolean): Promise<T[]> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = JSON.parse(localStorage.getItem(collectionName) || '[]');
                if (filterFn) {
                    resolve(data.filter(filterFn));
                } else {
                    resolve(data);
                }
            }, 150); 
        });
    },

    addDocument: async <T extends {id?: string}>(collectionName: string, doc: Omit<T, 'id'>): Promise<T> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = JSON.parse(localStorage.getItem(collectionName) || '[]') as T[];
                let newDoc: T;
                if(collectionName === 'purchaseReceipts') {
                    newDoc = { ...doc, id: generateId(), devuelto: 0 } as unknown as T;
                } else if (collectionName === 'salidas') {
                    newDoc = { ...doc, id: generateId(), status: 'Activo' } as unknown as T;
                } else {
                    newDoc = { ...doc, id: generateId() } as T;
                }
                data.push(newDoc);
                localStorage.setItem(collectionName, JSON.stringify(data));
                dispatchDataChange(collectionName);
                
                if (collectionToModuleMap[collectionName]) {
                    const userEmail = getCurrentUserEmail();
                    const moduleName = collectionToModuleMap[collectionName];
                    const identifier = getDocIdentifier(collectionName, newDoc);
                    addLogEntry(userEmail, 'CREACIÓN', moduleName, `Creó ${moduleName}: '${identifier}'`);
                }

                resolve(newDoc);
            }, 150);
        });
    },
    
    updateDocument: async <T extends {id?: string}>(collectionName: string, docId: string, updates: Partial<T>): Promise<T> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const data = JSON.parse(localStorage.getItem(collectionName) || '[]') as T[];
                    const docIndex = data.findIndex(doc => doc.id === docId);

                    if (docIndex === -1) {
                        return reject(new Error(`Document with id ${docId} not found in ${collectionName}`));
                    }
                    
                    const originalDoc = { ...data[docIndex] };
                    const updatedDoc = { ...data[docIndex], ...updates };
                    data[docIndex] = updatedDoc;
                    
                    localStorage.setItem(collectionName, JSON.stringify(data));
                    dispatchDataChange(collectionName);

                    if (collectionToModuleMap[collectionName]) {
                        const userEmail = getCurrentUserEmail();
                        const moduleName = collectionToModuleMap[collectionName];
                        const identifier = getDocIdentifier(collectionName, updatedDoc);
                        const isAnulacion = (updates as any).status === 'Anulado';
                        const action = isAnulacion ? 'ANULACIÓN' : 'MODIFICACIÓN';

                        let description = `${isAnulacion ? 'Anuló' : 'Modificó'} ${moduleName}: '${identifier}'`;

                        if (action === 'MODIFICACIÓN') {
                            const changes: string[] = [];
                            for (const key in updates) {
                                if (Object.prototype.hasOwnProperty.call(updates, key) && key !== 'id') {
                                    const oldValue = originalDoc[key as keyof T];
                                    const newValue = updates[key as keyof T];
                                    
                                    const formattedOld = JSON.stringify(oldValue);
                                    const formattedNew = JSON.stringify(newValue);
                        
                                    if (formattedOld !== formattedNew) {
                                        if (Array.isArray(oldValue) || (typeof oldValue === 'object' && oldValue !== null)) {
                                            changes.push(`se modificó '${key}'`);
                                        } else {
                                            changes.push(`cambió '${key}' de '${oldValue || 'vacío'}' a '${newValue || 'vacío'}'`);
                                        }
                                    }
                                }
                            }
                            if (changes.length > 0) {
                                description += `. Detalles: ${changes.join('; ')}`;
                            }
                        }

                        addLogEntry(userEmail, action, moduleName, description);
                    }

                    resolve(updatedDoc);
                } catch (error) {
                    reject(error);
                }
            }, 150);
        });
    },

    deleteDocument: async (collectionName: string, docId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    let data = JSON.parse(localStorage.getItem(collectionName) || '[]') as {id?: string}[];
                    const docToDelete = data.find(doc => doc.id === docId);
                    const initialLength = data.length;
                    data = data.filter(doc => doc.id !== docId);

                    if (data.length === initialLength) {
                        console.warn(`Document with id ${docId} not found in ${collectionName}`);
                    }

                    localStorage.setItem(collectionName, JSON.stringify(data));
                    dispatchDataChange(collectionName);

                    if (docToDelete && collectionToModuleMap[collectionName]) {
                        const userEmail = getCurrentUserEmail();
                        const moduleName = collectionToModuleMap[collectionName];
                        const identifier = getDocIdentifier(collectionName, docToDelete);
                        addLogEntry(userEmail, 'ELIMINACIÓN', moduleName, `Eliminó ${moduleName}: '${identifier}'`);
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 150);
        });
    },
    addDataChangeListener,
    removeDataChangeListener,
};

export default localStorageService;