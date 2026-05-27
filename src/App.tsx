import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';

import { theme } from './theme/theme';
import { useAppState } from './hooks/useAppState';
import { useNotifications } from './hooks/useNotifications';

import { Sidebar } from './components/layout/Sidebar';
import { NotificationSnackbar } from './components/notifications/NotificationSnackbar';
import { Login } from './components/auth/Login';
import { AdminLogin } from './components/auth/AdminLogin';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { Dashboard } from './views/Dashboard';
import { ContainersView } from './views/ContainersView';
import { FilesView } from './views/FilesView';
import { SearchView } from './views/SearchView';
import { PlaceholderView } from './views/PlaceholderView';
import { CreateTxtMainView } from './views/CreateMainView';
import { OcrView } from './views/OCRView';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { Unauthorized } from './views/Unauthorized';

import { apiClient } from './api/client';
import { Container, User } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const mockUser: User = {
  id: 'Undefined',
  name: 'Undefined',
  email: 'Undefined',
  role: 'user',
};

const AppContent: React.FC = () => {
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [createContainerOpen, setCreateContainerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [isTokenProcessed, setIsTokenProcessed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        apiClient.setToken(storedToken);
        setAuthLoading(true);
        try {
          const userData = await apiClient.getUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            setUser(mockUser);
            setIsAuthenticated(true);
          }
        } catch (error) {
          localStorage.removeItem('auth_token');
          setAuthError('Your session has expired. Please login again.');
        } finally {
          setAuthLoading(false);
          setIsTokenProcessed(true);
        }
      } else {
        setIsTokenProcessed(true);
      }
    };
    checkExistingToken();
  }, []);

  const handleLogin = async (token: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      apiClient.setToken(token);
      const userData = await apiClient.getUser();
      const finalUser = userData || { ...mockUser, role: 'user' };
      setUser(finalUser);
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', token);
      navigate('/dashboard');
    } catch (error: any) {
      setAuthError(error?.message || 'Invalid token');
      apiClient.setToken('');
      localStorage.removeItem('auth_token');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogin = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { access_token, user: userData } = await apiClient.adminLogin(email, password);

      const finalUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      };

      setUser(finalUser);
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', access_token);
      navigate('/admin');
    } catch (error: any) {
      setAuthError(error?.response?.data?.detail || error?.message || 'Admin login failed');
      apiClient.setToken('');
      localStorage.removeItem('auth_token');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    apiClient.setToken('');
    setIsAuthenticated(false);
    setUser(null);
    setSelectedContainer(null);
    navigate('/login');
  };

  const handleContainerSelect = (container: Container) => {
    setSelectedContainer(container);
    setActiveMenuItem('files');
    setCurrentTab(2);
  };

  const handleMenuItemClick = (menuId: string, tabIndex: number) => {
    if ((menuId === 'search' || menuId === 'photo' || menuId === 'create-txt') && !selectedContainer) {
      return;
    }
    setActiveMenuItem(menuId);
    setCurrentTab(tabIndex);
  };

  const renderCurrentView = () => {
    switch (currentTab) {
      case 0:
        return <Dashboard onContainerSelect={handleContainerSelect} onTabChange={setCurrentTab} user={user || mockUser} />;
      case 1:
        return <ContainersView onContainerSelect={handleContainerSelect} onCreateContainerOpen={() => setCreateContainerOpen(true)} createContainerOpen={createContainerOpen} onCloseCreateContainer={() => setCreateContainerOpen(false)} />;
      case 2:
        return <FilesView selectedContainer={selectedContainer} onBrowseContainers={() => { setActiveMenuItem('containers'); setCurrentTab(1); }} />;
      case 4:
        return <SearchView selectedContainer={selectedContainer} onContainerSelect={handleContainerSelect} />;
      case 5:
        return <OcrView selectedContainer={selectedContainer} onContainerSelect={handleContainerSelect} />;
      case 6:
        return <CreateTxtMainView selectedContainer={selectedContainer} />;
      default:
        return <Dashboard onContainerSelect={handleContainerSelect} onTabChange={setCurrentTab} user={user || mockUser} />;
    }
  };

  if (!isTokenProcessed || authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} isLoading={authLoading} error={authError} />} />
      <Route path="/admin-login" element={<AdminLogin onLogin={handleAdminLogin} isLoading={authLoading} error={authError} />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/dashboard" element={
        <ProtectedRoute isAuthenticated={isAuthenticated}>
          <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)' }}>
            <Sidebar activeMenuItem={activeMenuItem} onMenuItemClick={handleMenuItemClick} user={user || mockUser} selectedContainer={selectedContainer} onLogout={handleLogout} />
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>{renderCurrentView()}</Box>
            </Box>
            <NotificationSnackbar notifications={[]} onClose={() => { }} />
          </Box>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute isAuthenticated={isAuthenticated} userRole={user?.role} allowedRoles={['admin', 'super_admin']}>
          <AdminDashboard user={user} />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;