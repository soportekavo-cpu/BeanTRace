

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import DashboardLayout from './pages/DashboardLayout';
import { HighlightProvider } from './contexts/HighlightContext';
import { useToast } from './hooks/useToast';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HighlightProvider>
            <Main />
          </HighlightProvider>
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

const Main: React.FC = () => {
  const { user, loading, error } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (error) {
      addToast(error, 'error');
    }
  }, [error, addToast]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        Autenticando...
      </div>
    );
  }

  return user ? <DashboardLayout /> : (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Acceso no autorizado</h2>
        <p className="text-muted-foreground mt-2">
          {error || "Por favor, inicia sesión con una cuenta de Google autorizada."}
        </p>
      </div>
    </div>
  );
}

export default App;