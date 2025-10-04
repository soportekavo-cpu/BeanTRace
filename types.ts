
export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: string;
}

export interface AppUser {
    id?: string;
    email: string;
    role: 'Admin' | 'Manager' | 'User';
}

export interface AppRole {
    id?: string;
    name: string;
    isDefault: boolean;
}

export interface Exporter {
    id?: string;
    name: string;
    licenseNumber: string;
}

export interface Buyer {
    id?: string;
    name: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
}

export interface Supplier {
    id?: string;
    name: string;
    phone: string;
    email: string;
}

export interface Client {
    id?: string;
    name: string;
    phone: string;
    email: string;
}

// FIX: Added the missing Seller interface.
export interface Seller {
    id?: string;
    name: string;
}

export enum ContractStatus {
    DRAFT = 'Borrador',
    ACTIVE = 'Activo',
    COMPLETED = 'Completado',
    CANCELLED = 'Cancelado'
}

export interface Contract {
    id: string;
    contractNumber: string;
    exporterId: string;
    exporterName: string;
    buyerId: string;
    buyerName: string;
    contractDate: string;
    saleDate: string;
    coffeeType: string;
    quantity: number; // in qqo
    position: string;
    differential: number;
    priceUnit: 'CTS/LB' | '46 Kg.';
    shipmentMonth: string;
    isFinished: boolean;
    certifications: string[];
    status: ContractStatus;
    contractPdfUrl?: string;
    instructionsPdfUrl?: string;
}