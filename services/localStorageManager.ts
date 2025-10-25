import { DataService } from './dataService';
import localStorageService from './localStorage';
import firestoreService from './firestore';

// En el entorno de AI Studio, siempre usaremos el servicio de localStorage.
// Una herramienta de compilación de producción (como Vite, Webpack) reemplazaría `process.env.USE_FIRESTORE`
// a 'true', permitiendo que la compilación use el firestoreService.
const useFirestore = process.env.USE_FIRESTORE === 'true';

const api: DataService = useFirestore ? firestoreService : localStorageService;

export default api;