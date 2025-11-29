import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Box,
  Divider,
  Button,
} from '@mui/material';
import {
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Notifications as NotificationsIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { AppState } from '../../types';

interface HeaderProps {
  currentTab: number;
  appState: AppState;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  notificationsCount: number;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  appState,
  onViewModeChange,
  notificationsCount,
  onLogout,
}) => {
  const getTitle = () => {
    switch (currentTab) {
      case 0: return 'Dashboard';
      case 1: return 'Containers';
      case 2: return 'Files';
      case 3: return 'Analytics';
      case 4: return 'Search';
      case 5: return 'Photo';
      case 6: return 'Security';
      default: return 'Dashboard';
    }
  };

  return (
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
          {getTitle()}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Grid View">
            <IconButton 
              size="small" 
              onClick={() => onViewModeChange('grid')}
              color={appState.viewMode === 'grid' ? 'primary' : 'default'}
              sx={{ fontSize: '1.25rem' }}
            >
              <ViewModuleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="List View">
            <IconButton 
              size="small"
              onClick={() => onViewModeChange('list')}
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
            <Badge badgeContent={notificationsCount} color="error" sx={{ 
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

        {onLogout && (
          <Tooltip title="Logout">
            <Button
              variant="outlined"
              color="secondary"
              onClick={onLogout}
              startIcon={<ExitToAppIcon />}
              size="small"
              sx={{
                color: 'text.secondary',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  borderColor: 'error.main',
                  color: 'error.main',
                }
              }}
            >
              Logout
            </Button>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  );
};