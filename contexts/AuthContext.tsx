import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppUser, AppRole, PagePermissions } from '../types';
import api from '../services/localStorageManager';
import { useToast } from '../hooks/useToast';

interface AuthContextType {
  user: User | null;
  roleDetails: AppRole | null;
  loading: boolean;
  error: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateAdminPermissions = (): { [key: string]: PagePermissions } => {
    const allPermissions: PagePermissions = { view: true, add: true, edit: true, delete: true, viewCosts: true, viewAnalysis: true, viewPrices: true, editEntrada: true, editSalida: true, canFinalize: true };
    const adminPermissions: { [key: string]: PagePermissions } = {};
    
    const allPageKeys = [
        'dashboard', 'contracts', 'contracts-info', 'contracts-lots', 'contracts-threshing', 
        'ventasLocales', 'ingreso', 'rendimientos', 'reprocesos', 'mezclas', 'salidas', 
        'trazabilidad', 'entities', 'admin', 'coffeeTypes', 'byproducts', 'logs'
    ];
    
    allPageKeys.forEach(pageId => {
        adminPermissions[pageId] = { ...allPermissions };
    });
    
    return adminPermissions;
};

// --- SIMULACIÓN DE FIREBASE AUTH ---
// En una implementación real, usarías el SDK de Firebase.
// `import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';`

const simulateFirebaseSignIn = async (): Promise<{ email: string; uid: string, displayName: string } | null> => {
    // Esto simula la ventana emergente de Google. En la app real, el usuario seleccionaría su cuenta.
    // Para esta simulación, asumimos que el usuario 'pruebaappcoffee@gmail.com' siempre inicia sesión.
    console.log("Simulando inicio de sesión con Google...");
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ 
                email: 'pruebaappcoffee@gmail.com', 
                uid: 'firebase-uid-12345',
                displayName: 'Usuario de Prueba'
            });
        }, 1000);
    });
};

const simulateFirebaseSignOut = async () => {
    console.log("Simulando cierre de sesión de Firebase...");
    return Promise.resolve();
};
// --- FIN DE LA SIMULACIÓN ---


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roleDetails, setRoleDetails] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticate = async () => {
      setLoading(true);
      setError(null);
      
      // En una implementación real, esto sería `onAuthStateChanged(auth, async (firebaseUser) => { ... })`
      const firebaseUser = await simulateFirebaseSignIn();

      if (firebaseUser) {
        try {
          // 1. Verificar si el usuario de Firebase está en nuestra lista de usuarios autorizados.
          const appUsers = await api.getCollection<AppUser>('users');
          const foundAppUser = appUsers.find(u => u.email === firebaseUser.email);

          if (foundAppUser) {
            // 2. Si está autorizado, buscar su rol y permisos.
            const roles = await api.getCollection<AppRole>('roles');
            const foundRole = roles.find(r => r.name === foundAppUser.role);

            if (!foundRole) {
              throw new Error(`Rol "${foundAppUser.role}" no encontrado.`);
            }

            const sessionUser: User = {
                uid: foundAppUser.id!,
                email: foundAppUser.email,
                name: foundAppUser.name || firebaseUser.displayName,
                role: foundAppUser.role
            };
            
            let finalRoleDetails = foundRole;
            if (foundAppUser.role === 'Admin') {
                finalRoleDetails = { ...foundRole, permissions: generateAdminPermissions() };
            }

            setUser(sessionUser);
            setRoleDetails(finalRoleDetails);

          } else {
            // 3. Si no está en la lista, denegar acceso.
            setError(`Acceso no autorizado para ${firebaseUser.email}. Por favor, contacta al administrador.`);
            await simulateFirebaseSignOut();
            setUser(null);
            setRoleDetails(null);
          }
        } catch (e: any) {
          setError(e.message || "Ocurrió un error durante la autenticación.");
          await simulateFirebaseSignOut();
          setUser(null);
          setRoleDetails(null);
        }
      } else {
        // No hay usuario de Firebase logueado.
        setUser(null);
        setRoleDetails(null);
      }
      setLoading(false);
    };

    authenticate();
  }, []);

  const logout = async () => {
      await simulateFirebaseSignOut();
      setUser(null);
      setRoleDetails(null);
  };

  const value = { user, roleDetails, loading, error, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
