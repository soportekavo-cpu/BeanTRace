import { 
    AppUser, AppRole, Exporter, Buyer, Supplier, Client, Contract, ContractLot, PurchaseReceipt,
    ThreshingOrder, ThreshingOrderReceipt
} from '../types';

const generateId = () => Math.random().toString(36).substring(2, 15);

const seedData = {
    users: [
        { id: '1', email: 'admin@beantrace.com', role: 'Admin' },
        { id: '2', email: 'manager@beantrace.com', role: 'Manager' },
        { id: '3', email: 'user@beantrace.com', role: 'User' },
    ],
    roles: [
        { id: '1', name: 'Admin', isDefault: true },
        { id: '2', name: 'Manager', isDefault: false },
        { id: '3', name: 'User', isDefault: false },
    ],
    exporters: [
        { id: 'exp1', name: 'Exportadora El Carmen', licenseNumber: '988' },
        { id: 'exp2', name: 'Beneficio Santa Rosa', licenseNumber: '44360' },
    ],
    buyers: [
        { id: 'buy1', name: 'Starbucks Coffee Company', address: 'Seattle, WA', contactPerson: 'John Doe', phone: '123-456-7890', email: 'john.doe@starbucks.com' },
        { id: 'buy2', name: 'Peet\'s Coffee', address: 'Emeryville, CA', contactPerson: 'Jane Smith', phone: '098-765-4321', email: 'jane.smith@peets.com' },
    ],
    suppliers: [
        { id: 'sup1', name: 'Finca La Esmeralda', phone: '555-1111', email: 'info@esmeralda.com' },
        { id: 'sup2', name: 'Productor Independiente', phone: '555-3333', email: 'prod@indep.com' }
    ],
    clients: [
        { id: 'cli1', name: 'Cafetería El Gato Negro', phone: '555-2222', email: 'compras@gatonegro.com' }
    ],
    contracts: [
        {
            id: 'con1',
            contractNumber: 'SC-2024-001',
            exporterId: 'exp1',
            exporterName: 'Exportadora El Carmen',
            buyerId: 'buy1',
            buyerName: 'Starbucks Coffee Company',
            saleDate: '2024-05-10',
            coffeeType: 'SHG EP',
            quantity: 275.00,
            position: 'Julio 2024',
            differential: 25.50,
            priceUnit: 'CTS/LB',
            shipmentMonth: 'Agosto 2024',
            isFinished: false,
            certifications: ['Fairtrade', 'Orgánico'],
        }
    ],
    contractLots: [
        {
            id: 'lot1',
            contractId: 'con1',
            partida: '11/988/1',
            bultos: 100,
            empaque: 'Saco de Yute',
            pesoKg: 69,
            pesoQqs: 152.12,
            fijacion: 180,
            fechaFijacion: '2024-05-15',
            precioFinal: 205.50,
            guiaMuestra: 'DHL-12345',
            fechaEnvioMuestra: '2024-05-20',
            muestraAprobada: true,
            destino: 'New York, USA',
            isf: true,
            booking: 'BK-98765',
            naviera: 'Maersk',
            valorCobro: 31265.46,
            paymentStatus: 'unpaid',
        }
    ],
    purchaseReceipts: [
        {
            id: 'pr1',
            status: 'Activo',
            certificacion: ['Orgánico'],
            fecha: '2024-07-15',
            recibo: '1001',
            proveedorId: 'sup1',
            placaVehiculo: 'P-123ABC',
            piloto: 'Juan Perez',
            tipo: 'Pergamino',
            pesoBruto: 102,
            yute: 2,
            nylon: 0,
            tara: 2,
            pesoNeto: 100,
            precio: 1500,
            gMuestra: 500,
            gPrimera: 400,
            gRechazo: 25,
            primera: 80,
            rechazo: 5,
            totalBruto: 85,
            precioCatadura: 100,
            rendimientoTotal: 85,
            rendimientoPrimera: 80,
            rendimientoRechazo: 5,
            totalCompra: 153000,
            costoCatadura: 500,
            pesoBrutoEnvio: 0,
            diferencia: 0,
            trillado: 0,
            enBodega: 100,
            reciboDevuelto: false,
            notas: 'Café de altura, buena calidad.',
        },
        {
            id: 'pr2',
            status: 'Activo',
            certificacion: [],
            fecha: '2024-07-16',
            recibo: '1002',
            proveedorId: 'sup2',
            placaVehiculo: 'P-456DEF',
            piloto: 'Maria Garcia',
            tipo: 'Oro Lavado',
            pesoBruto: 76.5,
            yute: 1,
            nylon: 1,
            tara: 1.5,
            pesoNeto: 75,
            precio: 1600,
            gMuestra: 500,
            gPrimera: 410,
            gRechazo: 20,
            primera: 61.5,
            rechazo: 3,
            totalBruto: 64.5,
            precioCatadura: 90,
            rendimientoTotal: 86,
            rendimientoPrimera: 82,
            rendimientoRechazo: 4,
            totalCompra: 122400,
            costoCatadura: 270,
            pesoBrutoEnvio: 0,
            diferencia: 0,
            trillado: 25,
            enBodega: 50,
            reciboDevuelto: false,
            notas: 'Lote de prueba.',
        }
    ],
    threshingOrders: [],
    threshingOrderReceipts: [],
};

const initializeDB = () => {
    Object.keys(seedData).forEach(key => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(seedData[key as keyof typeof seedData]));
        }
    });
};

initializeDB();

const emitter = new EventTarget();

export const addDataChangeListener = (callback: EventListener) => {
    emitter.addEventListener('datachange', callback);
};

export const removeDataChangeListener = (callback: EventListener) => {
    emitter.removeEventListener('datachange', callback);
};

const dispatchDataChange = (collectionName: string) => {
    emitter.dispatchEvent(new CustomEvent('datachange', { detail: { collectionName } }));
};


const api = {
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
                const newDoc = { ...doc, id: generateId() } as T;
                data.push(newDoc);
                localStorage.setItem(collectionName, JSON.stringify(data));
                dispatchDataChange(collectionName);
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
                    
                    const updatedDoc = { ...data[docIndex], ...updates };
                    data[docIndex] = updatedDoc;
                    
                    localStorage.setItem(collectionName, JSON.stringify(data));
                    dispatchDataChange(collectionName);
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
                    const initialLength = data.length;
                    data = data.filter(doc => doc.id !== docId);

                    if (data.length === initialLength) {
                        console.warn(`Document with id ${docId} not found in ${collectionName}`);
                    }

                    localStorage.setItem(collectionName, JSON.stringify(data));
                    dispatchDataChange(collectionName);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 150);
        });
    },
};

export default api;