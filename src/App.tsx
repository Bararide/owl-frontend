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

import { Dashboard } from './views/Dashboard';
import { ContainersView } from './views/ContainersView';
import { FilesView } from './views/FilesView';
import { SearchView } from './views/SearchView';
import { PlaceholderView } from './views/PlaceholderView';

import { apiClient } from './api/client';
import { Container } from './api/client';
import { User } from './types';
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
  role: 'Senior Developer'
};

const App: React.FC = () => {
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [createContainerOpen, setCreateContainerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [isTokenProcessed, setIsTokenProcessed] = useState(false);

  const { state: appState, updateState } = useAppState();
  const { notifications, addNotification, removeNotification } = useNotifications();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.log('Token found in URL:', token);
      apiClient.setToken(token);
      localStorage.setItem('auth_token', token);
      
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
        console.log('Token removed from URL');
        setIsTokenProcessed(true);
      }, 100);
    } else {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        console.log('Token found in localStorage:', storedToken);
        apiClient.setToken(storedToken);
      } else {
        console.log('No token found');
      }
      setIsTokenProcessed(true);
    }
  }, []);

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
    if (menuId === 'search' && !selectedContainer) {
      addNotification({
        message: 'Please select a container first to use search functionality',
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
    switch (currentTab) {
      case 0:
        return (
          <Dashboard
            onContainerSelect={handleContainerSelect}
            onTabChange={setCurrentTab}
            user={mockUser}
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
          <PlaceholderView
            icon={<SecurityIcon sx={{ fontSize: 64, color: 'text.secondary' }} />}
            title="Security Coming Soon"
            description="Security settings and scans will be available here"
          />
        );
      default:
        return <Dashboard onContainerSelect={handleContainerSelect} onTabChange={setCurrentTab} user={mockUser} />;
    }
  };

  if (!isTokenProcessed) {
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

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)' }}>
          <Sidebar
            activeMenuItem={activeMenuItem}
            onMenuItemClick={handleMenuItemClick}
            user={mockUser}
            selectedContainer={selectedContainer}
          />

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Header
              currentTab={currentTab}
              appState={appState}
              onViewModeChange={handleViewModeChange}
              notificationsCount={notifications.length}
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