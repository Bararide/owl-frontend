import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  FileCopy as FileCopyIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Photo as PhotoIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { Container, User } from '../../api/client';

interface SidebarProps {
  activeMenuItem: string;
  onMenuItemClick: (menuId: string, tabIndex: number) => void;
  user: User;
  selectedContainer: Container | null;
  onLogout?: () => void;
}

const menuItems = [
  { icon: <DashboardIcon />, text: 'Dashboard', id: 'dashboard' },
  { icon: <StorageIcon />, text: 'Containers', id: 'containers' },
  { icon: <FileCopyIcon />, text: 'Files', id: 'files' },
  { icon: <SearchIcon />, text: 'Advanced search', id: 'search' },
  { icon: <PhotoIcon />, text: 'Photo', id: 'photo'},
  { icon: <SpeedIcon />, text: 'Analytics', id: 'analytics' },
  { icon: <SecurityIcon />, text: 'Security', id: 'security' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeMenuItem, 
  onMenuItemClick, 
  user,
  selectedContainer,
  onLogout 
}) => {
  const isSearchDisabled = !selectedContainer;
  const isPhotoDisabled = !selectedContainer;

  return (
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
          {menuItems.map((item) => {
            const isSearchItem = item.id === 'search';
            const isPhotoItem = item.id === 'photo';
            const isDisabled = (isSearchItem && isSearchDisabled) || (isPhotoItem && isPhotoDisabled);

            return (
              <Tooltip
                key={item.id}
                title={isDisabled ? "Select a container first to use this feature" : ""}
                placement="right"
                arrow
              >
                <ListItemButton
                  key={item.id}
                  selected={activeMenuItem === item.id}
                  onClick={() => {
                    if (isDisabled) return;
                    
                    const tabMap: Record<string, number> = {
                      dashboard: 0,
                      containers: 1,
                      files: 2,
                      analytics: 3,
                      search: 4,
                      photo: 5,
                      security: 6,
                    };
                    onMenuItemClick(item.id, tabMap[item.id] || 0);
                  }}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    py: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      '&:hover': { backgroundColor: 'primary.dark' }
                    },
                    ...(isDisabled && {
                      opacity: 0.5,
                      pointerEvents: 'none',
                      cursor: 'not-allowed',
                    })
                  }}
                  disabled={isDisabled}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: isDisabled ? 'text.disabled' : 'inherit', 
                      minWidth: 36, 
                      fontSize: '1.25rem' 
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      fontWeight: 600, 
                      fontSize: '0.9rem',
                      color: isDisabled ? 'text.disabled' : 'inherit'
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            );
          })}
        </Box>

        <Box sx={{ mt: 'auto' }}>
          <Box 
            sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                src={user.avatar}
                sx={{ 
                  width: 36, 
                  height: 36, 
                  mr: 1.5,
                  background: 'linear-gradient(135deg, #7367F0 0%, #CE9FFC 100%)',
                  fontSize: '0.875rem'
                }}
              >
                {user.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap fontSize="0.875rem">
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap fontSize="0.75rem">
                  {user.role}
                </Typography>
              </Box>
            </Box>
          </Box>

          {onLogout && (
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={onLogout}
              startIcon={<ExitToAppIcon />}
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
          )}
        </Box>
      </Box>
    </Drawer>
  );
};