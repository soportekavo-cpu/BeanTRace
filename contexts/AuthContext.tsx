
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppUser, AppRole } from '../types';
import api from '../services/localStorageManager';

interface AuthContextType {
  user: User | null;
  roleDetails: AppRole | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roleDetails, setRoleDetails] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('authUser');
      const storedRole = sessionStorage.getItem('authRole');
      if (storedUser && storedRole) {
        setUser(JSON.parse(storedUser));
        setRoleDetails(JSON.parse(storedRole));
      }
    } catch (error) {
      console.error("Could not parse user from session storage", error);
      sessionStorage.removeItem('authUser');
      sessionStorage.removeItem('authRole');
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    // Using a hardcoded password for demonstration purposes.
    if (pass !== 'password') {
        throw new Error('Contraseña incorrecta. (Pista: es "password")');
    }
    const users = await api.getCollection<AppUser>('users');
    const foundUser = users.find(u => u.email === email);

    if (foundUser) {
        const roles = await api.getCollection<AppRole>('roles');
        const foundRole = roles.find(r => r.name === foundUser.role);

        if (!foundRole) {
            throw new Error(`Rol "${foundUser.role}" no encontrado.`);
        }

        const sessionUser: User = {
            uid: foundUser.id!,
            email: foundUser.email,
            role: foundUser.role
        };
        setUser(sessionUser);
        setRoleDetails(foundRole);
        sessionStorage.setItem('authUser', JSON.stringify(sessionUser));
        sessionStorage.setItem('authRole', JSON.stringify(foundRole));
    } else {
        throw new Error('Usuario no encontrado.');
    }
  };

  const logout = () => {
      setUser(null);
      setRoleDetails(null);
      sessionStorage.removeItem('authUser');
      sessionStorage.removeItem('authRole');
  };

  const value = { user, roleDetails, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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