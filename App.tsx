
import React, { useState, useMemo } from 'react';
import { UserRole } from './types';
import LoginScreen from './components/auth/LoginScreen';
import CollectorDashboard from './components/collector/CollectorDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import { useAppData } from './hooks/useAppData';

export const AppDataContext = React.createContext<ReturnType<typeof useAppData> | null>(null);

function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const appData = useAppData();

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };
  
  const value = useMemo(() => appData, [appData]);

  const renderContent = () => {
    if (!userRole) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (userRole) {
      case UserRole.COLLECTOR:
        return <CollectorDashboard onLogout={handleLogout} />;
      case UserRole.MANAGER:
        return <ManagerDashboard onLogout={handleLogout} />;
      default:
        return <LoginScreen onLogin={handleLogin} />;
    }
  };

  return (
    <AppDataContext.Provider value={value}>
        <div className="bg-gray-50 min-h-screen text-gray-900">
            {renderContent()}
        </div>
    </AppDataContext.Provider>
  );
}

export default App;
