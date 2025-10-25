// Este archivo es un marcador de posición para tu implementación real de Firebase Firestore.
// El archivo `localStorageManager.ts` cambiará a este servicio cuando configures
// tu entorno de producción.

import { DataService } from './dataService';

// --- PASO 1: INSTALACIÓN E INICIALIZACIÓN ---
//
// 1. Instala el SDK de Firebase en tu proyecto:
//    npm install firebase
//
// 2. Descomenta las siguientes líneas e importa las funciones de Firestore.
/*
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
    query, where, serverTimestamp, Timestamp
} from 'firebase/firestore';
*/
//
// 3. Configura tu proyecto de Firebase. Reemplaza el objeto de configuración con
//    las credenciales de tu proyecto, que puedes encontrar en la consola de Firebase.
/*
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
*/
//
// --- FIN DEL PASO 1 ---


// --- PASO 2: REGLAS DE SEGURIDAD (¡CRÍTICO!) ---
//
// Antes de desplegar, DEBES configurar las Reglas de Seguridad de Firestore en la consola de Firebase.
// Estas reglas protegen tu base de datos de accesos no autorizados.
// Un ejemplo básico podría ser:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo permite leer y escribir a usuarios autenticados.
    match /{document=**} {
      allow read, write: if request.auth != null;
    }

    // Un ejemplo más granular: solo los Admins pueden editar roles.
    match /roles/{roleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
  }
}
*/
//
// --- FIN DEL PASO 2 ---

// --- PASO 3: NOTIFICACIONES POR CORREO (CLOUD FUNCTIONS) ---
//
// Para enviar correos de forma segura, usarás Cloud Functions.
// 1. Instala el CLI de Firebase: `npm install -g firebase-tools`
// 2. Inicia Firebase en tu proyecto: `firebase init functions`
// 3. En el archivo `functions/src/index.ts` que se crea, puedes añadir un trigger como este:
/*
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// Configura un servicio de envío de correos como Nodemailer, SendGrid, etc.
// const nodemailer = require('nodemailer');

admin.initializeApp();

// Ejemplo de función que se dispara al crear un nuevo recibo
export const onNewReceiptCreated = functions.firestore
    .document('purchaseReceipts/{receiptId}')
    .onCreate(async (snap, context) => {
        const newReceipt = snap.data();
        
        // 1. Lee la configuración de notificaciones
        const settingsDoc = await admin.firestore().collection('notifications').where('event', '==', 'new-receipt').get();
        if (settingsDoc.empty) {
            console.log("No hay configuración de notificación para nuevos recibos.");
            return;
        }
        const emails = settingsDoc.docs[0].data().emails;

        if (!emails) {
            console.log("No hay correos configurados para este evento.");
            return;
        }
        
        // 2. Prepara y envía el correo
        const subject = `Nuevo Recibo de Café Creado: ${newReceipt.recibo}`;
        const body = `Se ha creado un nuevo recibo de café en el sistema BeanTrace con el número ${newReceipt.recibo}.`;
        
        // Aquí iría tu lógica para enviar el correo con Nodemailer, SendGrid, etc.
        // await sendEmail(emails, subject, body);

        console.log(`Notificación enviada a ${emails} por el recibo ${newReceipt.recibo}`);
    });
*/
//
// --- FIN DEL PASO 3 ---


const errorMessage = "Firestore no está implementado. Este servicio debe ser reemplazado por una implementación real de Firebase durante el proceso de compilación de producción.";

const firestoreService: DataService = {
    generateId: () => {
        // Firestore genera los IDs automáticamente al usar `addDoc`, por lo que esta función
        // ya no será necesaria para crear documentos. Se puede mantener para otros usos si es necesario.
        // O simplemente puedes eliminarla de la interfaz DataService.
        // return doc(collection(db, 'some_collection')).id;
        throw new Error(errorMessage);
    },

    getCollection: async <T>(collectionName: string, filterFn?: (item: any) => boolean): Promise<T[]> => {
        // EJEMPLO DE IMPLEMENTACIÓN REAL:
        /*
        const collRef = collection(db, collectionName);
        // Si el filtro es simple, es MUCHO MÁS EFICIENTE usar una consulta de Firestore.
        // Por ejemplo, si filterFn era `(item) => item.contractId === 'some-id'`
        // la consulta sería: const q = query(collRef, where("contractId", "==", "some-id"));
        
        const snapshot = await getDocs(collRef);
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));

        // El filtrado en el cliente sigue siendo útil para lógicas complejas que Firestore no soporta.
        if (filterFn) {
            return data.filter(filterFn);
        }
        return data;
        */
       throw new Error(errorMessage);
    },

    addDocument: async <T extends {id?: string}>(collectionName: string, docData: Omit<T, 'id'>): Promise<T> => {
        // EJEMPLO DE IMPLEMENTACIÓN REAL:
        /*
        // Considera añadir un campo `createdAt` para un mejor ordenamiento.
        const docWithTimestamp = { ...docData, createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, collectionName), docWithTimestamp);
        return { ...docData, id: docRef.id } as T;
        */
        throw new Error(errorMessage);
    },

    updateDocument: async <T extends {id?: string}>(collectionName: string, docId: string, updates: Partial<T>): Promise<T> => {
         // EJEMPLO DE IMPLEMENTACIÓN REAL:
        /*
        const docRef = doc(db, collectionName, docId);
        // Considera añadir un campo `updatedAt` para auditoría.
        const updatesWithTimestamp = { ...updates, updatedAt: serverTimestamp() };
        await updateDoc(docRef, updatesWithTimestamp);
        // Firestore no devuelve el documento actualizado, así que lo simulamos.
        // En una app más compleja, podrías volver a leer el documento o manejar el estado localmente.
        return { id: docId, ...updates } as T;
        */
        throw new Error(errorMessage);
    },
    
    deleteDocument: async (collectionName: string, docId: string): Promise<void> => {
        // EJEMPLO DE IMPLEMENTACIÓN REAL:
        /*
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
        */
        throw new Error(errorMessage);
    },

    // Las actualizaciones en tiempo real son una de las grandes ventajas de Firestore.
    // Esta implementación simple solo notifica que los datos cambiaron, pero no proporciona los nuevos datos.
    // Una implementación completa usaría `onSnapshot` de Firestore para obtener actualizaciones en tiempo real.
    addDataChangeListener: () => { console.warn("El listener de cambios de Firestore no está implementado para actualizaciones en tiempo real."); },
    removeDataChangeListener: () => { console.warn("El listener de cambios de Firestore no está implementado para actualizaciones en tiempo real."); },
};

export default firestoreService;

// --- NOTA SOBRE FECHAS (TIMESTAMPS) ---
// Firestore usa un objeto `Timestamp` especial para las fechas. Al leer datos, es posible que
// necesites convertir estos Timestamps a objetos Date de JavaScript o a strings ISO.
// Ejemplo de conversión:
// const firebaseTimestamp = doc.data().createdAt; // Objeto Timestamp de Firestore
// const jsDate = firebaseTimestamp.toDate();       // Objeto Date de JavaScript
// const isoString = jsDate.toISOString();        // String ISO
//
// Al escribir, puedes usar `serverTimestamp()` para que Firebase ponga la fecha actual en el servidor.