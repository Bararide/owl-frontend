// App.tsx
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Zoom, CircularProgress } from '@mui/material';

import { theme } from './theme/theme';
import { useAppState } from './hooks/useAppState';
import { useNotifications } from './hooks/useNotifications';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NotificationSnackbar } from './components/notifications/NotificationSnackbar';
import { FloatingActionButton } from './components/styled';
import { Login } from './components/auth/Login';

import { Dashboard } from './views/Dashboard';
import { ContainersView } from './views/ContainersView';
import { FilesView } from './views/FilesView';
import { SearchView } from './views/SearchView';
import { PlaceholderView } from './views/PlaceholderView';

import { apiClient } from './api/client';
import { Container, User } from './api/client';
import { 
  Speed as SpeedIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { OcrView } from './views/OCRView';

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
  role: 'Senior Developer'
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

  useEffect(() => {
    const checkExistingToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedToken) {
        console.log('Token found in localStorage, validating...');
        apiClient.setToken(storedToken);
        setAuthLoading(true);
        
        try {
          const userData = await apiClient.getUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            addNotification({
              message: 'Successfully logged in',
              severity: 'success',
              open: true,
            });
          }
        } catch (error) {
          console.error('Invalid token:', error);
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
  }, [addNotification]);

  const handleLogin = async (token: string) => {
    setAuthLoading(true);
    setAuthError('');

    try {
      apiClient.setToken(token);
      
      const userData = await apiClient.getUser();
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('auth_token', token);
        
        addNotification({
          message: 'Successfully logged in!',
          severity: 'success',
          open: true,
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError('Invalid token. Please check your access token and try again.');
      apiClient.setToken('');
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
    console.log(menuId)
    if (menuId === 'search' && !selectedContainer) {
      addNotification({
        message: 'Please select a container first to use search functionality',
        severity: 'warning',
        open: true,
      });
      return;
    }

    if (menuId === 'photo' && !selectedContainer) {
      addNotification({
        message: 'Please select a container first to use photo ocr functionality',
        severity: 'warning',
        open: true,
      });
      return;
    }
    
    setActiveMenuItem(menuId);
    setCurrentTab(tabIndex);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    updateState({ viewMode: mode });
  };

  const renderCurrentView = () => {
    console.log(currentTab)
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
        console.log(selectedContainer)
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
      default:
        return <Dashboard onContainerSelect={handleContainerSelect} onTabChange={setCurrentTab} user={user || mockUser} />;
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
          background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)'
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
          <Login 
            onLogin={handleLogin} 
            isLoading={authLoading}
            error={authError}
          />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)' }}>
          <Sidebar
            activeMenuItem={activeMenuItem}
            onMenuItemClick={handleMenuItemClick}
            user={user || mockUser}
            selectedContainer={selectedContainer}
            onLogout={handleLogout}
          />

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Header
              currentTab={currentTab}
              appState={appState}
              onViewModeChange={handleViewModeChange}
              notificationsCount={notifications.length}
              onLogout={handleLogout}
            />

            <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
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