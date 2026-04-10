import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Zoom, CircularProgress } from '@mui/material';

import { theme } from './theme/theme';
import { useAppState } from './hooks/useAppState';
import { useNotifications } from './hooks/useNotifications';

import { Sidebar } from './components/layout/Sidebar';
import { NotificationSnackbar } from './components/notifications/NotificationSnackbar';
import { FloatingActionButton } from './components/styled';
import { Login } from './components/auth/Login';
import { FloatingControls } from './components/layout/FloatingControls';

import { Dashboard } from './views/Dashboard';
import { ContainersView } from './views/ContainersView';
import { FilesView } from './views/FilesView';
import { SearchView } from './views/SearchView';
import { PlaceholderView } from './views/PlaceholderView';
import { CreateTxtMainView } from './views/CreateMainView';
import { OcrView } from './views/OCRView';

import { apiClient } from './api/client';
import { Container, User } from './api/client';
import {
  Speed as SpeedIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Add as AddIcon,
} from '@mui/icons-material';

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
  id: 'user123',
  name: 'Алексей Петров',
  email: 'alexey@company.com',
  role: 'Senior Developer',
};

const App: React.FC = () => {
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [createContainerOpen, setCreateContainerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [isTokenProcessed, setIsTokenProcessed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const { state: appState, updateState } = useAppState();
  const { notifications, addNotification, removeNotification } = useNotifications();

  // Проверка токена при загрузке
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
      setUser(userData || mockUser);
      setIsAuthenticated(true);
      localStorage.setItem('auth_token', token);
      addNotification({
        message: 'Successfully logged in!',
        severity: 'success',
        open: true,
      });
    } catch (error: any) {
      setAuthError(error?.message || 'Invalid token');
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
    addNotification({
      message: 'Successfully logged out',
      severity: 'info',
      open: true,
    });
  };

  const handleContainerSelect = (container: Container) => {
    setSelectedContainer(container);
    setActiveMenuItem('files');
    setCurrentTab(2);
    addNotification({
      message: `Selected container: ${container.id}`,
      severity: 'success',
      open: true,
    });
  };

  const handleMenuItemClick = (menuId: string, tabIndex: number) => {
    if ((menuId === 'search' || menuId === 'photo' || menuId === 'create-txt') && !selectedContainer) {
      addNotification({
        message: 'Please select a container first',
        severity: 'warning',
        open: true,
      });
      return;
    }
    setActiveMenuItem(menuId);
    setCurrentTab(tabIndex);
  };

  const renderCurrentView = () => {
    switch (currentTab) {
      case 0:
        return (
          <Dashboard
            onContainerSelect={handleContainerSelect}
            onTabChange={setCurrentTab}
            user={user || mockUser}
          />
        );
      case 1:
        return (
          <ContainersView
            onContainerSelect={handleContainerSelect}
            onCreateContainerOpen={() => setCreateContainerOpen(true)}
            createContainerOpen={createContainerOpen}
            onCloseCreateContainer={() => setCreateContainerOpen(false)}
          />
        );
      case 2:
        return (
          <FilesView
            selectedContainer={selectedContainer}
            onBrowseContainers={() => {
              setActiveMenuItem('containers');
              setCurrentTab(1);
            }}
          />
        );
      case 3:
        return (
          <PlaceholderView
            icon={<SpeedIcon sx={{ fontSize: 64, color: 'text.secondary' }} />}
            title="Analytics Coming Soon"
            description="Performance metrics and analytics will be available here"
          />
        );
      case 4:
        return (
          <SearchView
            selectedContainer={selectedContainer}
            onContainerSelect={handleContainerSelect}
          />
        );
      case 5:
        return (
          <OcrView
            selectedContainer={selectedContainer}
            onContainerSelect={handleContainerSelect}
          />
        );
      case 6:
        return <CreateTxtMainView selectedContainer={selectedContainer} />;
      case 7:
        return (
          <PlaceholderView
            icon={<SecurityIcon sx={{ fontSize: 64, color: 'text.secondary' }} />}
            title="Security"
            description="Security settings and monitoring"
          />
        );
      default:
        return (
          <Dashboard
            onContainerSelect={handleContainerSelect}
            onTabChange={setCurrentTab}
            user={user || mockUser}
          />
        );
    }
  };

  if (!isTokenProcessed || authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Login onLogin={handleLogin} isLoading={authLoading} error={authError} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)',
          }}
        >
          {/* Компактный сайдбар (иконки) */}
          <Sidebar
            activeMenuItem={activeMenuItem}
            onMenuItemClick={handleMenuItemClick}
            user={user || mockUser}
            selectedContainer={selectedContainer}
            onLogout={handleLogout}
          />

          {/* Основная область — занимает всё оставшееся пространство */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Плавающие элементы управления (уведомления, профиль) */}
            <FloatingControls
              notificationsCount={notifications.length}
              onLogout={handleLogout}
              user={user || mockUser}
              viewMode={appState.viewMode}
              onViewModeChange={(mode) => updateState({ viewMode: mode })}
            />

            {/* Контент без отступов */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
              {renderCurrentView()}
            </Box>
          </Box>

          <NotificationSnackbar
            notifications={notifications}
            onClose={removeNotification}
          />

          <Zoom in={true}>
            <FloatingActionButton
              color="primary"
              onClick={() => setCreateContainerOpen(true)}
              sx={{ position: 'fixed', bottom: 24, right: 24 }}
            >
              <AddIcon />
            </FloatingActionButton>
          </Zoom>
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;