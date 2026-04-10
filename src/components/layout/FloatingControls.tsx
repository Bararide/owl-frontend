import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Typography,
  Avatar,
  Paper,
  Zoom,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ExitToApp as ExitToAppIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { User } from '../../api/client';

interface FloatingControlsProps {
  notificationsCount: number;
  onLogout?: () => void;
  user: User;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  notificationsCount,
  onLogout,
  user,
  viewMode,
  onViewModeChange,
}) => {
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationsMenuAnchor, setNotificationsMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleNotificationsClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsMenuAnchor(event.currentTarget);
  };

  const handleViewClick = (event: React.MouseEvent<HTMLElement>) => {
    setViewMenuAnchor(event.currentTarget);
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          zIndex: 1100,
          pointerEvents: 'none',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            p: 0.5,
            borderRadius: 3,
            background: 'rgba(26, 31, 54, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'auto',
          }}
        >
          <Tooltip title="View options">
            <IconButton size="small" sx={{ color: 'white' }} onClick={handleViewClick}>
              {viewMode === 'grid' ? <ViewModuleIcon /> : <ViewListIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Filter">
            <IconButton size="small" sx={{ color: 'white' }}>
              <FilterIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Sort">
            <IconButton size="small" sx={{ color: 'white' }}>
              <SortIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton size="small" sx={{ color: 'white' }} onClick={handleNotificationsClick}>
              <Badge
                badgeContent={notificationsCount}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.7rem',
                    height: 16,
                    minWidth: 16,
                  },
                }}
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={user.name}>
            <IconButton size="small" sx={{ color: 'white' }} onClick={handleProfileClick}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>

      {/* Меню профиля */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 200,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2">{user.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <MenuItem onClick={() => setProfileMenuAnchor(null)}>
          <PersonIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => setProfileMenuAnchor(null)}>
          <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Settings
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <MenuItem
          onClick={() => {
            setProfileMenuAnchor(null);
            onLogout?.();
          }}
        >
          <ExitToAppIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Меню уведомлений (заглушка) */}
      <Menu
        anchorEl={notificationsMenuAnchor}
        open={Boolean(notificationsMenuAnchor)}
        onClose={() => setNotificationsMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 280,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2">Notifications</Typography>
        </Box>
        <Divider />
        <MenuItem>
          <Typography variant="body2" color="text.secondary">
            No new notifications
          </Typography>
        </MenuItem>
      </Menu>

      {/* Меню режима просмотра */}
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={() => setViewMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => onViewModeChange('grid')}>
          <ViewModuleIcon sx={{ mr: 1.5 }} />
          Grid View
          {viewMode === 'grid' && (
            <Box component="span" sx={{ ml: 'auto', color: 'primary.main' }}>
              ✓
            </Box>
          )}
        </MenuItem>
        <MenuItem onClick={() => onViewModeChange('list')}>
          <ViewListIcon sx={{ mr: 1.5 }} />
          List View
          {viewMode === 'list' && (
            <Box component="span" sx={{ ml: 'auto', color: 'primary.main' }}>
              ✓
            </Box>
          )}
        </MenuItem>
      </Menu>
    </>
  );
};