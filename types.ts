
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

export interface Seller {
    id?: string;
    name: string;
}

export interface Contract {
    id: string;
    contractNumber: string;
    exporterId: string;
    exporterName: string;
    buyerId: string;
    buyerName: string;
    saleDate: string;
    coffeeType: string;
    quantity: number; 
    position: string;
    differential: number;
    priceUnit: 'CTS/LB' | '46 Kg.';
    shipmentMonth: string;
    isFinished: boolean;
    certifications: string[];
    contractPdfUrl?: string;
    instructionsPdfUrl?: string;
}

export interface ContractLot {
    id?: string;
    contractId: string;
    partida: string;
    bultos: number;
    empaque: string;
    pesoKg: number;
    pesoQqs: number;
    fijacion: number;
    fechaFijacion: string;
    precioFinal: number;
    pdfFijacionUrl?: string;
    guiaMuestra: string;
    fechaEnvioMuestra: string;
    muestraAprobada: boolean;
    destino: string;
    isf: boolean;
    booking: string;
    naviera: string;
    valorCobro: number;
    paymentStatus: 'unpaid' | 'in-progress' | 'paid';
}

export interface CuppingProfile {
  score: number;
  fragranceAroma: number;
  flavor: number;
  aftertaste: number;
  acidity: number;
  body: number;
  balance: number;
  uniformity: number;
  cleanCup: number;
  sweetness: number;
  notes: string;
  defects: string;
  roastLevel: 'Ligero' | 'Medio' | 'Oscuro' | '';
  cuppingDate: string;
}

export interface PurchaseReceipt {
    id: string;
    status: 'Activo' | 'Anulado';
    // General Info
    certificacion: string[];
    fecha: string; 
    recibo: string; 
    proveedorId: string;
    placaVehiculo: string;
    piloto: string;
    // Coffee Type
    tipo: string;
    customTipo?: string;
    // Weight
    pesoBruto: number;
    yute: number;
    nylon: number;
    tara: number;
    pesoNeto: number; 
    pdfReciboUrl?: string;
    pdfEnvioUrl?: string;
    // Quality Analysis
    precio: number;
    gMuestra: number;
    gPrimera: number;
    gRechazo: number;
    primera: number; 
    rechazo: number; 
    totalBruto: number;
    precioCatadura: number;
    // Yields
    rendimientoTotal: number;
    rendimientoPrimera: number;
    rendimientoRechazo: number;
    // Costs
    totalCompra: number;
    costoCatadura: number;
    pesoBrutoEnvio: number;
    diferencia: number;
    // Storage
    trillado: number;
    enBodega: number;
    reciboDevuelto: boolean;
    notas: string;
    // Cupping
    cuppingProfile?: CuppingProfile;
  }

export interface ThreshingOrder {
  id: string;
  contractId: string;
  orderNumber: string;
  creationDate: string;
  lotIds: string[];
  notes: string;
  totalToThresh: number;
  totalPrimeras: number;
  totalCatadura: number;
}

export interface ThreshingOrderReceipt {
  id: string;
  threshingOrderId: string;
  receiptId: string;
  supplierName: string;
  coffeeType: string;
  receiptNumber: string;
  amountToThresh: number;
  primeras: number;
  catadura: number;
}

// FIX: Add missing Factura and Payment types
export interface Factura {
    id: string;
    facturaNumber: string;
    buyerId: string;
    buyerName: string;
    issueDate: string;
    dueDate: string;
    lotIds: string[];
    totalAmount: number;
    status: 'Draft' | 'Sent' | 'PartiallyPaid' | 'Paid' | 'Overdue';
    notes: string;
}

export interface Payment {
    id: string;
    facturaId: string;
    date: string;
    amount: number;
    method: 'Transferencia' | 'Cheque' | 'Efectivo' | 'Otro';
    reference: string;
    notes: string;
}