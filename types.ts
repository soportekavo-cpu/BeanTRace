


export interface PagePermissions {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    viewCosts?: boolean;
    viewAnalysis?: boolean;
    viewPrices?: boolean;
    editEntrada?: boolean;
    editSalida?: boolean;
    canFinalize?: boolean;
}

export interface Log {
    id: string;
    timestamp: string;
    userEmail: string;
    action: 'CREACIÓN' | 'MODIFICACIÓN' | 'ANULACIÓN' | 'ELIMINACIÓN';
    module: string;
    description: string;
}

export interface AppRole {
    id: string;
    name: string;
    isDefault: boolean;
    permissions: { [key: string]: PagePermissions };
}

export type AppUserRole = 'Admin' | 'Manager' | 'User';

export interface AppUser {
    id?: string;
    name?: string;
    email: string;
    role: AppUserRole;
}

export interface User {
    uid: string;
    email: string;
    name: string;
    role: string;
}

export interface Exporter {
    id: string;
    name: string;
    licenseNumber: string;
    logo?: string;
}

export interface Buyer {
    id: string;
    name: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
}

export interface Supplier {
    id: string;
    name: string;
    phone: string;
    email: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
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
    isServiceContract?: boolean;
    añoCosecha?: string;
    contractPdf?: string;
    instructionsPdf?: string;
}

export interface ContractLot {
    id: string;
    contractId: string;
    partida: string;
    bultos: number;
    empaque: string;
    pesoKg: number;
    pesoQqs: number;
    fijacion: number;
    fechaFijacion: string;
    precioFinal: number;
    guiaMuestra: string;
    fechaEnvioMuestra: string;
    muestraAprobada: boolean;
    destino: string;
    isf: boolean;
    isfSent: boolean;
    booking: string;
    naviera: string;
    valorCobro: number;
    añoCosecha?: string;
}

export interface CuppingProfile {
    humedad?: number;
    dictamen?: string;
    diferencial?: number;
    mezcla?: string;
    roastLevel?: '' | 'Ligero' | 'Medio' | 'Oscuro';
    cuppingDate: string;
    notes?: string;
}

export interface PurchaseReceipt {
    id: string;
    certificacion: string[];
    fecha: string;
    recibo: string;
    proveedorId: string;
    placaVehiculo: string;
    piloto: string;
    tipo: string;
    customTipo?: string;
    pesoBruto: number;
    yute: number;
    nylon: number;
    tara: number;
    precio: number;
    gMuestra: number;
    gPrimera: number;
    gRechazo: number;
    precioCatadura: number;
    pesoNetoEnvio: number;
    notas: string;
    cuppingProfile: CuppingProfile;
    status: 'Activo' | 'Anulado';
    pesoNeto: number;
    primera: number;
    rechazo: number;
    totalBruto: number;
    rendimientoTotal: number;
    rendimientoPrimera: number;
    rendimientoRechazo: number;
    totalCompra: number;
    costoCatadura: number;
    diferencia: number;
    trillado: number;
    enBodega: number;
    devuelto: number;
    pdfEnvio?: string;
}

export interface ThreshingOrder {
    id: string;
    contractId: string | null;
    orderNumber: string;
    creationDate: string;
    lotIds: string[];
    notes: string;
    totalToThresh: number;
    totalPrimeras: number;
    totalCatadura: number;
    orderType: 'Exportación' | 'Venta Local';
    clientId?: string | null;
    clientName?: string;
    description?: string;
    lote?: string;
    tipoPreparacion?: string;
    pesoVendido?: number;
    tipoCafe?: 'Lavado' | 'Natural';
    isFinished?: boolean;
}

export interface ThreshingOrderReceipt {
    id?: string;
    threshingOrderId: string;
    // Generic source ID (receipt, vignette, or mezcla)
    receiptId: string; 
    // Generic source number
    receiptNumber: string; 
    
    // NEW: to distinguish source type
    inputType: 'Recibo' | 'Viñeta' | 'Mezcla'; 
    
    supplierName?: string; // Optional, mainly for receipts
    coffeeType: string;
    amountToThresh: number;
    primeras: number;
    catadura: number;

    // For Viñetas/Mezclas with projected yield
    projectedPrimerasPercent?: number;
    projectedCataduraPercent?: number;
}

export interface CoffeeType {
    id: string;
    tipo: string;
}

export interface ByproductType {
    id: string;
    tipo: string;
}

export interface Viñeta {
    id: string;
    numeroViñeta: string;
    tipo: string;
    pesoNeto: number;
    originalPesoNeto: number;
    notas: string;
    status: 'En Bodega' | 'Reprocesado' | 'Mezclada' | 'Utilizada en Trilla' | 'Vendido' | 'Mezclada Parcialmente';
}

export interface Rendimiento {
    id: string;
    rendimientoNumber: string;
    creationDate: string;
    threshingOrderIds: string[];
    vignettes: Viñeta[];
    totalProyectadoPrimeras: number;
    totalProyectadoCatadura: number;
    totalRealPrimeras: number;
    totalRealCatadura: number;
    notes?: string;
    isFinalizado?: boolean;
}

export interface Reproceso {
    id: string;
    reprocesoNumber: string;
    creationDate: string;
    inputVignetteIds: string[];
    inputVignettesData: Viñeta[];
    outputVignettes: Viñeta[];
    totalInputWeight: number;
    totalOutputWeight: number;
    merma: number;
    notes: string;
    status: 'Activo' | 'Anulado';
    isFinalizado?: boolean;
    inputVignetteProjections?: Record<string, { porcentajePrimeras: number; porcentajeCatadura: number }>;
    totalProyectadoPrimeras?: number;
    totalProyectadoCatadura?: number;
    totalRealPrimeras?: number;
    totalRealCatadura?: number;
}

export interface MezclaVignetteInput {
    vignetteId: string;
    vignetteNumber: string;
    tipo: string;
    pesoUtilizado: number;
}

export interface Mezcla {
    id: string;
    mezclaNumber: string;
    creationDate: string;
    inputVignetteIds: string[];
    inputVignettesData: MezclaVignetteInput[];
    totalInputWeight: number;
    tipoMezcla: string;
    cantidadDespachada: number;
    sobranteEnBodega: number;
    status: 'Activo' | 'Despachado Parcialmente' | 'Agotado';
    notes?: string;
}

export interface SalidaMezclaInput {
    mezclaId: string;
    mezclaNumber: string;
    pesoUtilizado: number;
    descripcionEnvio: string;
    sacosYute: number;
    sacosNylon: number;
    tara: number;
    pesoBruto: number;
}

export interface SalidaReciboInput {
    reciboId: string;
    reciboNumber: string;
    proveedorName: string;
    tipoCafe: string;
    pesoDevuelto: number;
    descripcionDevolucion: string;
    sacosYute: number;
    sacosNylon: number;
    tara: number;
    pesoBruto: number;
}

export interface Salida {
    id: string;
    salidaNumber: string;
    fecha: string;
    tipoSalida: 'Mezcla' | 'Devolución Recibo';
    
    placaVehiculo: string;
    piloto: string;

    sacosYute: number;
    sacosNylon: number;
    pesoNeto: number;
    tara: number;
    pesoBruto: number;
    isExportacion: boolean;
    cartaPorte?: string;
    partidas?: string;
    notas?: string;
    status: 'Activo' | 'Anulado';

    // Used for both types now
    clienteId?: string;
    clienteName?: string;

    // Mezcla Specific
    mezclas?: SalidaMezclaInput[];

    // Recibo Specific
    recibos?: SalidaReciboInput[];
}


export interface Seller {
    id: string;
    name: string;
}

export interface CategorizedResults {
    contracts?: Contract[];
    contractLots?: ContractLot[];
    purchaseReceipts?: PurchaseReceipt[];
    threshingOrders?: ThreshingOrder[];
    rendimientos?: Rendimiento[];
    reprocesos?: Reproceso[];
    mezclas?: Mezcla[];
    salidas?: Salida[];
    vignettes?: Viñeta[];
}

export interface NotificationSetting {
  id: string;
  event: 'new-receipt' | 'new-salida' | 'new-threshing-order' | 'update-threshing-order' | 'void-threshing-order';
  emails: string;
}