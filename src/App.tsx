import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  Box, Typography, TextField, Button,
  AppBar, Toolbar, IconButton, Drawer,
  ListItemIcon, ListItemText, Chip, Avatar, Divider,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Tooltip,
  Card, CardContent, LinearProgress,
  AlertColor, ListItemButton, Fab, Zoom, Fade,
  InputAdornment, Menu,
  MenuItem, Badge, Skeleton
} from '@mui/material';
import { 
  Add as AddIcon, 
  CloudUpload as CloudUploadIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  FileCopy as FileCopyIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Delete
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import { apiClient, Container, CreateContainerRequest, SearchRequest, File as ApiFile } from './api/client';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface Notification {
  id: string;
  open: boolean;
  message: string;
  severity: AlertColor;
  action?: () => void;
}

interface AppState {
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'status';
  filter: {
    status: string[];
    type: string[];
    environment: string[];
  };
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7367F0',
      light: '#9E95F5',
      dark: '#5A4FE0',
    },
    secondary: {
      main: '#28C76F',
      light: '#5DDC91',
      dark: '#1DA25A',
    },
    background: {
      default: '#0F1424',
      paper: '#1A1F36',
    },
    error: {
      main: '#EA5455',
    },
    warning: {
      main: '#FF9F43',
    },
    info: {
      main: '#00CFE8',
    },
    success: {
      main: '#28C76F',
    },
  },
  typography: {
    fontFamily: '"Inter", "Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          padding: '8px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px -6px rgba(115, 103, 240, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 16px 0 rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'visible',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          '&:hover': {
            boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.3)',
            borderColor: 'rgba(115, 103, 240, 0.2)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 0 0 2px rgba(115, 103, 240, 0.1)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

const GlassCard = styled(motion(Card))(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.background.paper, 0.95)} 0%, 
    ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
  backdropFilter: 'blur(16px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  boxShadow: `
    0 4px 24px 0 ${alpha(theme.palette.common.black, 0.15)},
    inset 0 1px 0 0 ${alpha(theme.palette.common.white, 0.05)}
  `,
}));

const GradientCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)',
  },
}));

const FloatingActionButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  borderRadius: 12,
  width: 56,
  height: 56,
  zIndex: 1000,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  boxShadow: '0 4px 20px -4px rgba(115, 103, 240, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 24px -4px rgba(115, 103, 240, 0.5)',
  },
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
}));

const StatusIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: Container['status'] }>(({ theme, status }) => {
  const colors: Record<Container['status'], string> = {
    running: theme.palette.success.main,
    stopped: theme.palette.error.main,
    error: theme.palette.error.dark,
    starting: theme.palette.warning.main,
  };

  return {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: colors[status],
    boxShadow: `0 0 6px ${colors[status]}`,
    animation: status === 'running' ? 'pulse 2s infinite' : 'none',
  };
});

const AnimatedChip = styled(motion(Chip))(({ theme }) => ({
  transition: 'all 0.2s ease',
  cursor: 'pointer',
}));

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -20, scale: 1.02 }
};

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
};

const useAppState = () => {
  const [state, setState] = useLocalStorage<AppState>('app-state', {
    viewMode: 'grid',
    sortBy: 'name',
    filter: {
      status: [],
      type: [],
      environment: [],
    },
  });

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, [setState]);

  return { state, updateState };
};

const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, addNotification, removeNotification };
};

const useContainers = () => {
  return useQuery({ 
    queryKey: ['containers'],
    queryFn: () => apiClient.getContainers(),
  });
};

const useCreateContainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateContainerRequest) => apiClient.createContainer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
};

const useDeleteContainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (containerId: string) => apiClient.deleteContainer(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
};

const useRestartContainer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (containerId: string) => apiClient.restartContainer(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
};

const useFiles = (containerId: string | undefined) => {
  return useQuery({ 
    queryKey: ['files', containerId],
    queryFn: () => containerId ? apiClient.getFiles(containerId) : Promise.resolve([]),
    enabled: !!containerId,
  });
};

const useSemanticSearch = () => {
  return useMutation({
    mutationFn: (data: SearchRequest) => apiClient.semanticSearch(data),
  });
};

const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.healthCheck(),
    refetchInterval: 30000,
  });
};

const LoadingSkeleton: React.FC<{ type?: 'card' | 'list' | 'table' }> = ({ type = 'card' }) => {
  if (type === 'card') {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[...Array(6)].map((_, index) => (
          <Box key={index} sx={{ width: 'calc(33.333% - 16px)', minWidth: 280 }}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Box sx={{ ml: 2, flexGrow: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              </Box>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1, mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={50} height={20} />
                <Skeleton variant="rounded" width={50} height={20} />
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    );
  }

  return <CircularProgress />;
};

interface FileCardProps {
  file: ApiFile;
  onSelect: (file: ApiFile) => void;
  onAction: (action: string, file: ApiFile) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onSelect, onAction }) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleAction = (action: string) => {
    onAction(action, file);
    handleMenuClose();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <DescriptionIcon color="primary" />;
    if (mimeType.includes('pdf')) return <DescriptionIcon color="error" />;
    if (mimeType.includes('text') || mimeType.includes('json')) return <DescriptionIcon color="info" />;
    return <DescriptionIcon color="action" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const truncatePath = (path: string, maxLength = 15) => {
    if (path.length <= maxLength) return path;
    
    const start = path.substring(0, 8);
    const end = path.substring(path.length - 7);
    return `${start}...${end}`;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 280, minWidth: 240 }}>
      <motion.div
        whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
        whileTap={{ scale: 0.98 }}
      >
        <GlassCard 
          onClick={() => onSelect(file)}
          sx={{ 
            cursor: 'pointer',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                <Box sx={{ mr: 1.5 }}>
                  {getFileIcon(file.mime_type)}
                </Box>
                <Typography 
                  variant="body2" 
                  color="text.primary" 
                  noWrap
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}
                >
                  {file.name || file.path.split('/').pop()}
                </Typography>
              </Box>
              
              <IconButton 
                size="small" 
                onClick={handleMenuOpen}
                sx={{ 
                  opacity: 0.6,
                  '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' }
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ mb: 2 }}>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                display: 'block', 
                mb: 0.5,
                fontFamily: 'monospace'
              }}
            >
              Path: {truncatePath(file.path, 15)}
            </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Size: {formatFileSize(file.size)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tooltip title="File Type">
                <Chip
                  label={file.mime_type.split('/')[1] || file.mime_type}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.6rem', height: 18 }}
                />
              </Tooltip>
              
              <Tooltip title="Created">
                <Typography variant="caption" color="text.secondary" fontSize="0.6rem">
                  {new Date(file.created_at).toLocaleDateString()}
                </Typography>
              </Tooltip>
            </Box>
          </CardContent>
        </GlassCard>
      </motion.div>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }
        }}
      >
        <MenuItem onClick={() => handleAction('download')}>
          <ListItemIcon><CloudUploadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('view')}>
          <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Content</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('delete')}>
          <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

const FilesView: React.FC<{ containerId: string }> = ({ containerId }) => {
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(containerId);
  const { addNotification } = useNotifications();

  const handleFileAction = useCallback((action: string, file: ApiFile) => {
    switch (action) {
      case 'download':
        addNotification({
          message: `Downloading file: ${file.name || file.path}`,
          severity: 'info',
          open: true,
        });
        break;
      case 'view':
        addNotification({
          message: `Viewing file: ${file.name || file.path}`,
          severity: 'info',
          open: true,
        });
        break;
      case 'delete':
        addNotification({
          message: `Deleting file: ${file.name || file.path}`,
          severity: 'warning',
          open: true,
        });
        break;
      default:
        addNotification({
          message: `${action} action performed on file`,
          severity: 'info',
          open: true,
        });
    }
  }, [addNotification]);

  const handleFileSelect = useCallback((file: ApiFile) => {
    addNotification({
      message: `Selected file: ${file.name || file.path}`,
      severity: 'success',
      open: true,
    });
  }, [addNotification]);

  if (!containerId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Container Selected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a container to view its files
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Files in Container
        </Typography>
        <Button 
          startIcon={<RefreshIcon />}
          onClick={() => refetchFiles()}
          variant="outlined"
          size="medium"
        >
          Refresh
        </Button>
      </Box>

      {isLoadingFiles ? (
        <LoadingSkeleton type="card" />
      ) : files.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Files Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This container doesn't have any files yet
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {files.map((file: ApiFile) => (
            <FileCard
              key={file.id}
              file={file}
              onSelect={handleFileSelect}
              onAction={handleFileAction}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

interface ContainerCardProps {
  container: Container;
  onSelect: (container: Container) => void;
  onAction: (action: string, container: Container) => void;
}

const ContainerCard: React.FC<ContainerCardProps> = ({ container, onSelect, onAction }) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleAction = (action: string) => {
    onAction(action, container);
    handleMenuClose();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 320, minWidth: 280 }}>
      <motion.div
        whileHover={{ y: -4, transition: { type: "spring", stiffness: 400 } }}
        whileTap={{ scale: 0.98 }}
      >
        <GlassCard 
          onClick={() => onSelect(container)}
          sx={{ 
            cursor: 'pointer',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          {container.env_label.value === 'prod' && (
            <Chip
              label="Production"
              color="error"
              size="small"
              sx={{
                position: 'absolute',
                top: -8,
                right: 12,
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 20
              }}
            />
          )}

          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                <StatusIndicator status={container.status} sx={{ mr: 1.5 }} />
                <Typography 
                  variant="body1" 
                  color="primary" 
                  noWrap
                  sx={{ 
                    fontFamily: 'Monospace',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  {container.id.substring(0, 12)}...
                </Typography>
              </Box>
              
              <IconButton 
                size="small" 
                onClick={handleMenuOpen}
                sx={{ 
                  opacity: 0.6,
                  '&:hover': { opacity: 1, backgroundColor: 'rgba(255,255,255,0.08)' }
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
              <AnimatedChip 
                label={container.env_label.value}
                size="small"
                variant="filled"
                sx={{ 
                  backgroundColor: '#00CFE8',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 20
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              />
              <AnimatedChip 
                label={container.type_label.value}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">CPU</Typography>
                <Typography variant="caption" fontWeight="600">
                  {container.cpu_usage}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={container.cpu_usage} 
                color={container.cpu_usage > 80 ? "error" : "primary"}
                sx={{ 
                  height: 4, 
                  borderRadius: 2,
                  mb: 1.5 
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" color="text.secondary">Memory</Typography>
                <Typography variant="caption" fontWeight="600">
                  {container.memory_usage}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={container.memory_usage} 
                color={container.memory_usage > 80 ? "error" : "secondary"}
                sx={{ 
                  height: 4, 
                  borderRadius: 2 
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tooltip title="Memory Limit">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MemoryIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '1rem' }} />
                  <Typography variant="caption" fontSize="0.7rem">
                    {container.memory_limit}MB
                  </Typography>
                </Box>
              </Tooltip>
              
              <Tooltip title="Storage Quota">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StorageIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '1rem' }} />
                  <Typography variant="caption" fontSize="0.7rem">
                    {container.storage_quota}MB
                  </Typography>
                </Box>
              </Tooltip>
              
              <Tooltip title="File Limit">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6, fontSize: '1rem' }} />
                  <Typography variant="caption" fontSize="0.7rem">
                    {container.file_limit}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </CardContent>
        </GlassCard>
      </motion.div>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }
        }}
      >
        <MenuItem onClick={() => handleAction('restart')}>
          <ListItemIcon><RefreshIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Restart</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('stop')}>
          <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Stop</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('delete')}>
          <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('logs')}>
          <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Logs</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('settings')}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

const StatsOverview: React.FC = () => {
  const { data: containers = [] } = useContainers();
  const { data: healthStatus } = useHealthCheck();

  const stats = [
    { 
      label: 'Active Containers', 
      value: containers.filter((c: Container) => c.status === 'running').length.toString(), 
      icon: <SpeedIcon />, 
      color: 'primary', 
      change: '+2' 
    },
    { 
      label: 'Total Storage', 
      value: `${containers.reduce((acc: number, c: Container) => acc + c.storage_quota, 0) / 1024} GB`, 
      icon: <StorageIcon />, 
      color: 'secondary', 
      change: '+5.1' 
    },
    { 
      label: 'Memory Usage', 
      value: `${Math.round(containers.reduce((acc: number, c: Container) => acc + c.memory_usage, 0) / (containers.length || 1))}%`, 
      icon: <MemoryIcon />, 
      color: 'warning', 
      change: '-3.2' 
    },
    { 
      label: 'Service Status', 
      value: healthStatus?.status === 'online' ? 'Online' : 'Offline', 
      icon: <TrendingUpIcon />, 
      color: healthStatus?.status === 'online' ? 'success' : 'error', 
      change: healthStatus?.status === 'online' ? '+0.1' : '-0.1' 
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
      {stats.map((stat, index) => (
        <Box key={stat.label} sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GradientCard>
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, fontSize: '0.875rem' }}>
                      {stat.label}
                    </Typography>
                    <Chip 
                      label={stat.change} 
                      size="small" 
                      color={stat.change.startsWith('+') ? 'success' : 'error'}
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      opacity: 0.7,
                      '& svg': { fontSize: 32 }
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </GradientCard>
          </motion.div>
        </Box>
      ))}
    </Box>
  );
};

const EnhancedSearch: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          position: 'relative',
          maxWidth: 600,
          mx: 'auto',
          mb: 4
        }}
      >
        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search containers, files, or commands..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon 
                  sx={{ 
                    color: isFocused ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s ease'
                  }} 
                />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setQuery('')}
                  sx={{ opacity: 0.6 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 3,
              backgroundColor: 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.15)',
              },
              ...(isFocused && {
                boxShadow: '0 2px 16px 0 rgba(115, 103, 240, 0.15)',
                borderColor: 'primary.main',
              })
            }
          }}
        />
        
        <Fade in={isFocused}>
          <Box sx={{ 
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            p: 2,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            zIndex: 1000
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: '0.75rem' }}>
              Quick Search
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {['running containers', 'recent files', 'error logs', 'config files'].map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  size="small"
                  clickable
                  onClick={() => setQuery(filter)}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 24 }}
                />
              ))}
            </Box>
          </Box>
        </Fade>
      </Box>
    </motion.div>
  );
};

const CreateContainerDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateContainerRequest) => void;
}> = ({ open, onClose, onCreate }) => {
  const [formData, setFormData] = useState<CreateContainerRequest>({
    container_id: '',
    memory_limit: 512,
    storage_quota: 1024,
    file_limit: 10,
    env_label: { key: 'environment', value: 'development' },
    type_label: { key: 'type', value: 'workspace' },
    commands: ['search', 'debug', 'all', 'create'],
    privileged: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
    setFormData({
      container_id: '',
      memory_limit: 512,
      storage_quota: 1024,
      file_limit: 10,
      env_label: { key: 'environment', value: 'development' },
      type_label: { key: 'type', value: 'workspace' },
      commands: ['search', 'debug', 'all', 'create'],
      privileged: false
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Container</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            label="Container ID"
            value={formData.container_id}
            onChange={(e) => setFormData(prev => ({ ...prev, container_id: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Memory Limit (MB)"
            type="number"
            value={formData.memory_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, memory_limit: parseInt(e.target.value) }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Storage Quota (MB)"
            type="number"
            value={formData.storage_quota}
            onChange={(e) => setFormData(prev => ({ ...prev, storage_quota: parseInt(e.target.value) }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="File Limit"
            type="number"
            value={formData.file_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, file_limit: parseInt(e.target.value) }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Create</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Dashboard: React.FC = () => {
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [createContainerOpen, setCreateContainerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');

  const { state: appState, updateState } = useAppState();
  const { notifications, addNotification, removeNotification } = useNotifications();

  const { data: containers = [], isLoading: isLoadingContainers, refetch: refetchContainers } = useContainers();
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(selectedContainer?.id);
  const createContainerMutation = useCreateContainer();
  const deleteContainerMutation = useDeleteContainer();
  const restartContainerMutation = useRestartContainer();
  const semanticSearchMutation = useSemanticSearch();

  const handleContainerAction = useCallback((action: string, container: Container) => {
    switch (action) {
      case 'restart':
        restartContainerMutation.mutate(container.id, {
          onSuccess: () => {
            addNotification({
              message: `Container ${container.id} restart initiated`,
              severity: 'info',
              open: true,
            });
            refetchContainers();
          },
          onError: (error) => {
            addNotification({
              message: `Failed to restart container: ${error.message}`,
              severity: 'error',
              open: true,
            });
          },
        });
        break;
      case 'stop':
        addNotification({
          message: `Stop action performed on ${container.id}`,
          severity: 'info',
          open: true,
        });
        break;
      case 'delete':
        deleteContainerMutation.mutate(container.id, {
          onSuccess: () => {
            addNotification({
              message: `Container ${container.id} deleted`,
              severity: 'success',
              open: true,
            });
            if (selectedContainer?.id === container.id) {
              setSelectedContainer(null);
            }
          },
          onError: (error) => {
            addNotification({
              message: `Failed to delete container: ${error.message}`,
              severity: 'error',
              open: true,
            });
          },
        });
        break;
      default:
        addNotification({
          message: `${action} action performed on ${container.id}`,
          severity: 'info',
          open: true,
        });
    }
  }, [addNotification, restartContainerMutation, deleteContainerMutation, refetchContainers, selectedContainer]);

  const handleFileAction = useCallback((action: string, file: ApiFile) => {
    switch (action) {
      case 'download':
        addNotification({
          message: `Downloading file: ${file.name || file.path}`,
          severity: 'info',
          open: true,
        });
        break;
      case 'view':
        addNotification({
          message: `Viewing file: ${file.name || file.path}`,
          severity: 'info',
          open: true,
        });
        break;
      case 'delete':
        addNotification({
          message: `Deleting file: ${file.name || file.path}`,
          severity: 'warning',
          open: true,
        });
        break;
      default:
        addNotification({
          message: `${action} action performed on file`,
          severity: 'info',
          open: true,
        });
    }
  }, [addNotification]);

  const handleSearch = useCallback((query: string) => {
    if (containers.length > 0) {
      semanticSearchMutation.mutate({
        query,
        container_id: containers[0].id,
        limit: 10
      }, {
        onSuccess: (data) => {
          addNotification({
            message: `Found ${data.results?.length || 0} results for: ${query}`,
            severity: 'info',
            open: true,
          });
        },
        onError: (error) => {
          addNotification({
            message: `Search failed: ${error.message}`,
            severity: 'error',
            open: true,
          });
        },
      });
    } else {
      addNotification({
        message: `Searching for: ${query}`,
        severity: 'info',
        open: true,
      });
    }
  }, [addNotification, semanticSearchMutation, containers]);

  const handleContainerSelect = useCallback((container: Container) => {
    setSelectedContainer(container);
    setActiveMenuItem('files');
    setCurrentTab(2);
    addNotification({
      message: `Selected container: ${container.id}`,
      severity: 'success',
      open: true,
    });
  }, [addNotification]);

  const handleFileSelect = useCallback((file: ApiFile) => {
    addNotification({
      message: `Selected file: ${file.name || file.path}`,
      severity: 'success',
      open: true,
    });
  }, [addNotification]);

  const handleCreateContainer = useCallback((data: CreateContainerRequest) => {
    createContainerMutation.mutate(data, {
      onSuccess: (container) => {
        addNotification({
          message: `Container ${container.id} created successfully`,
          severity: 'success',
          open: true,
        });
      },
      onError: (error) => {
        addNotification({
          message: `Failed to create container: ${error.message}`,
          severity: 'error',
          open: true,
        });
      },
    });
  }, [addNotification, createContainerMutation]);

  const mockUser: User = {
    id: 'user123',
    name: 'Алексей Петров',
    email: 'alexey@company.com',
    role: 'Senior Developer'
  };

  const menuItems = [
    { icon: <DashboardIcon />, text: 'Dashboard', id: 'dashboard' },
    { icon: <StorageIcon />, text: 'Containers', id: 'containers' },
    { icon: <FileCopyIcon />, text: 'Files', id: 'files' },
    { icon: <SearchIcon />, text: 'Search', id: 'search' },
    { icon: <SpeedIcon />, text: 'Analytics', id: 'analytics' },
    { icon: <SecurityIcon />, text: 'Security', id: 'security' },
  ];

  const quickActions = [
    { 
      icon: <AddIcon />, 
      label: 'New Container', 
      color: 'primary',
      onClick: () => setCreateContainerOpen(true)
    },
    { 
      icon: <CloudUploadIcon />, 
      label: 'Upload Files', 
      color: 'secondary',
      onClick: () => {
        addNotification({
          message: 'Upload files functionality',
          severity: 'info',
          open: true,
        });
      }
    },
    { 
      icon: <SpeedIcon />, 
      label: 'Performance', 
      color: 'warning',
      onClick: () => {
        addNotification({
          message: 'Performance metrics opened',
          severity: 'info',
          open: true,
        });
        setActiveMenuItem('analytics');
        setCurrentTab(3);
      }
    },
    { 
      icon: <SecurityIcon />, 
      label: 'Security Scan', 
      color: 'error',
      onClick: () => {
        addNotification({
          message: 'Security scan initiated',
          severity: 'info',
          open: true,
        });
        setActiveMenuItem('security');
        setCurrentTab(5);
      }
    },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
            backgroundColor: 'background.default',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            background: 'linear-gradient(180deg, #0F1424 0%, #13182B 100%)',
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #7367F0 0%, #CE9FFC 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                boxShadow: '0 2px 8px rgba(115, 103, 240, 0.3)'
              }}
            >
              <StorageIcon sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight="700" color="primary">
              ContainerHub
            </Typography>
          </Box>

          <Divider sx={{ mb: 2.5, opacity: 0.2 }} />

          <Box sx={{ flexGrow: 1 }}>
            {menuItems.map((item) => (
              <ListItemButton
                key={item.id}
                selected={activeMenuItem === item.id}
                onClick={() => {
                  setActiveMenuItem(item.id);
                  const tabMap: Record<string, number> = {
                    dashboard: 0,
                    containers: 1,
                    files: 2,
                    analytics: 3,
                    search: 4,
                    security: 5,
                  };
                  setCurrentTab(tabMap[item.id] || 0);
                }}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    '&:hover': { backgroundColor: 'primary.dark' }
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36, fontSize: '1.25rem' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                />
              </ListItemButton>
            ))}
          </Box>

          <Box 
            sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                src={mockUser.avatar}
                sx={{ 
                  width: 36, 
                  height: 36, 
                  mr: 1.5,
                  background: 'linear-gradient(135deg, #7367F0 0%, #CE9FFC 100%)',
                  fontSize: '0.875rem'
                }}
              >
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap fontSize="0.875rem">
                  {mockUser.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap fontSize="0.75rem">
                  {mockUser.role}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar 
          position="static" 
          color="transparent" 
          elevation={0}
          sx={{ 
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
            backgroundColor: 'rgba(15, 20, 36, 0.8)'
          }}
        >
          <Toolbar sx={{ gap: 1.5, minHeight: '64px !important' }}>
            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.25rem' }}>
              {currentTab === 0 && 'Dashboard'}
              {currentTab === 1 && 'Containers'}
              {currentTab === 2 && `Files - ${selectedContainer ? selectedContainer.id.substring(0, 12) + '...' : 'No container selected'}`}
              {currentTab === 3 && 'Analytics'}
              {currentTab === 4 && 'Search'}
              {currentTab === 5 && 'Security'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Grid View">
                <IconButton 
                  size="small" 
                  onClick={() => updateState({ viewMode: 'grid' })}
                  color={appState.viewMode === 'grid' ? 'primary' : 'default'}
                  sx={{ fontSize: '1.25rem' }}
                >
                  <ViewModuleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="List View">
                <IconButton 
                  size="small"
                  onClick={() => updateState({ viewMode: 'list' })}
                  color={appState.viewMode === 'list' ? 'primary' : 'default'}
                  sx={{ fontSize: '1.25rem' }}
                >
                  <ViewListIcon />
                </IconButton>
              </Tooltip>
              
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 20 }} />
              
              <Tooltip title="Filter">
                <IconButton size="small" sx={{ fontSize: '1.25rem' }}>
                  <FilterIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sort">
                <IconButton size="small" sx={{ fontSize: '1.25rem' }}>
                  <SortIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Tooltip title="Notifications">
              <IconButton size="small" sx={{ fontSize: '1.25rem' }}>
                <Badge badgeContent={notifications.length} color="error" sx={{ 
                  '& .MuiBadge-badge': { 
                    fontSize: '0.7rem', 
                    height: 16, 
                    minWidth: 16 
                  } 
                }}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          <ConnectionTest />
          
          <motion.div
            key={currentTab}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={{ duration: 0.2 }}
          >
            {currentTab === 0 && (
              <Box>
                <StatsOverview />
                <EnhancedSearch onSearch={handleSearch} />
                
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 2.5, fontSize: '1.5rem' }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {quickActions.map((action, index) => (
                      <Box key={action.label} sx={{ flex: '1 1 140px', minWidth: 140 }}>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Card 
                            onClick={action.onClick}
                            sx={{ 
                              textAlign: 'center', 
                              p: 2.5, 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              }
                            }}
                          >
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                backgroundColor: `${action.color}.main`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 1.5,
                                color: 'white',
                                '& svg': { fontSize: 24 }
                              }}
                            >
                              {action.icon}
                            </Box>
                            <Typography variant="body2" fontWeight="600">
                              {action.label}
                            </Typography>
                          </Card>
                        </motion.div>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                    <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>
                      Recent Containers
                    </Typography>
                    <Button 
                      startIcon={<AddIcon />}
                      onClick={() => setCreateContainerOpen(true)}
                      variant="contained"
                      size="medium"
                    >
                      New Container
                    </Button>
                  </Box>

                  {isLoadingContainers ? (
                    <LoadingSkeleton type="card" />
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {containers.slice(0, 6).map((container: Container) => (
                        <ContainerCard
                          key={container.id}
                          container={container}
                          onSelect={handleContainerSelect}
                          onAction={handleContainerAction}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {currentTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>
                    All Containers
                  </Typography>
                  <Button 
                    startIcon={<AddIcon />}
                    onClick={() => setCreateContainerOpen(true)}
                    variant="contained"
                    size="medium"
                  >
                    New Container
                  </Button>
                </Box>

                {isLoadingContainers ? (
                  <LoadingSkeleton type="card" />
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {containers.map((container: Container) => (
                      <ContainerCard
                        key={container.id}
                        container={container}
                        onSelect={handleContainerSelect}
                        onAction={handleContainerAction}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {currentTab === 2 && (
              <Box>
                {!selectedContainer ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <FileCopyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Container Selected
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Please select a container to view its files
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => {
                        setActiveMenuItem('containers');
                        setCurrentTab(1);
                      }}
                    >
                      Browse Containers
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
                          Files in {selectedContainer.id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedContainer.env_label.value} • {selectedContainer.type_label.value}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          startIcon={<RefreshIcon />}
                          onClick={() => refetchFiles()}
                          variant="outlined"
                          size="medium"
                        >
                          Refresh
                        </Button>
                        <Button 
                          startIcon={<CloudUploadIcon />}
                          onClick={() => handleFileAction('upload', {} as ApiFile)}
                          variant="contained"
                          size="medium"
                        >
                          Upload File
                        </Button>
                      </Box>
                    </Box>

                    {isLoadingFiles ? (
                      <LoadingSkeleton type="card" />
                    ) : files.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <FileCopyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Files Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          This container doesn't have any files yet
                        </Typography>
                        <Button 
                          variant="contained" 
                          onClick={() => handleFileAction('upload', {} as ApiFile)}
                        >
                          Upload First File
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {files.map((file: ApiFile) => (
                          <FileCard
                            key={file.id}
                            file={file}
                            onSelect={handleFileSelect}
                            onAction={handleFileAction}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {currentTab === 3 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SpeedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Analytics Coming Soon
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Performance metrics and analytics will be available here
                </Typography>
              </Box>
            )}

            {currentTab === 4 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Search Coming Soon
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Advanced search functionality will be available here
                </Typography>
              </Box>
            )}

            {currentTab === 5 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Security Coming Soon
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Security settings and scans will be available here
                </Typography>
              </Box>
            )}
          </motion.div>
        </Box>
      </Box>

      <CreateContainerDialog
        open={createContainerOpen}
        onClose={() => setCreateContainerOpen(false)}
        onCreate={handleCreateContainer}
      />

      <Zoom in={true}>
        <FloatingActionButton
          color="primary"
          onClick={() => setCreateContainerOpen(true)}
        >
          <AddIcon />
        </FloatingActionButton>
      </Zoom>

      <Snackbar
        open={notifications.some(n => n.open)}
        autoHideDuration={6000}
        onClose={() => notifications.forEach(n => removeNotification(n.id))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ position: 'fixed' }}
      >
        <Box>
          {notifications.map((notification) => (
            <Alert 
              key={notification.id}
              severity={notification.severity}
              onClose={() => removeNotification(notification.id)}
              sx={{ 
                mb: 1, 
                minWidth: 300,
                borderRadius: 2,
                fontSize: '0.875rem'
              }}
            >
              {notification.message}
            </Alert>
          ))}
        </Box>
      </Snackbar>
    </Box>
  );
};

const ConnectionTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');

  const testConnection = async () => {
    try {
      console.log('🧪 Testing connection to:', apiClient['client'].defaults.baseURL);
      const result = await apiClient.healthCheck();
      setTestResult(`✅ Success: ${JSON.stringify(result)}`);
      console.log('✅ Health check result:', result);
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
      console.error('❌ Health check failed:', error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Box sx={{ p: 2, mb: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6">Connection Test</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>{testResult}</Typography>
      <Button onClick={testConnection} variant="outlined" sx={{ mt: 1 }}>
        Test Again
      </Button>
    </Box>
  );
};

const App: React.FC = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const [isTokenProcessed, setIsTokenProcessed] = useState(false);

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

      apiClient.getContainers()
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
        <Dashboard />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;