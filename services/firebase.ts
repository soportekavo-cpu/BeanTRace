// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// FIX: Changed import from 'firebase/auth' to '@firebase/auth' to resolve module export errors.
import { getAuth } from "@firebase/auth";
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager 
} from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLy6O00m1sNcnFb-tEeDWcKDeeFnM-1a8",
  authDomain: "backend-beantrace.firebaseapp.com",
  projectId: "backend-beantrace",
  storageBucket: "backend-beantrace.firebasestorage.app",
  messagingSenderId: "856317065167",
  appId: "1:856317065167:web:0ef4bd023452080dff04ba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services using the modular SDK
export const auth = getAuth(app);

// Initialize Firestore with long-polling to avoid WebChannel issues in previews
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});


export default app;