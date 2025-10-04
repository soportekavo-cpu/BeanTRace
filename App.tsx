
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </ThemeProvider>
  );
};

const Main: React.FC = () => {
  const { user } = useAuth();
  
  return user ? <DashboardLayout /> : <LoginPage />;
}

export default App;
