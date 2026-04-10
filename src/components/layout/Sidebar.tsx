import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  PhotoCamera as PhotoCameraIcon,
  Create as CreateIcon,
  Security as SecurityIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
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
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, tabIndex: 0 },
  { id: 'containers', label: 'Containers', icon: <FolderIcon />, tabIndex: 1 },
  { id: 'files', label: 'Files', icon: <DescriptionIcon />, tabIndex: 2 },
  { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />, tabIndex: 3 },
  { id: 'search', label: 'Search', icon: <SearchIcon />, tabIndex: 4 },
  { id: 'photo', label: 'Photo OCR', icon: <PhotoCameraIcon />, tabIndex: 5 },
  { id: 'create-txt', label: 'Create TXT', icon: <CreateIcon />, tabIndex: 6 },
  { id: 'security', label: 'Security', icon: <SecurityIcon />, tabIndex: 7 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenuItem,
  onMenuItemClick,
  user,
  selectedContainer,
  onLogout,
}) => {
  const [expanded, setExpanded] = useState(false);

  const toggleDrawer = () => setExpanded(!expanded);

  const handleItemClick = (item: typeof menuItems[0]) => {
    onMenuItemClick(item.id, item.tabIndex);
  };

  return (
    <>
    <Box
      sx={{
        position: 'fixed',
        left: 16,
        top: 20,
        zIndex: 1200,
      }}
    >
      <Tooltip title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}>
        <IconButton
          onClick={toggleDrawer}
          sx={{
            backgroundColor: 'rgba(26, 31, 54, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(26, 31, 54, 0.95)',
            },
          }}
        >
          {expanded ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Tooltip>
    </Box>

      {/* Выдвижная панель с иконками и текстом */}
      <Drawer
        variant="temporary"
        open={expanded}
        onClose={toggleDrawer}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: 260,
            background: 'rgba(18, 22, 40, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
        }}
        SlideProps={{ direction: 'right' }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" noWrap>
              {user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {selectedContainer && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Current container
            </Typography>
            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
              {selectedContainer.id}
            </Typography>
          </Box>
        )}

        <List sx={{ pt: 0 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.id}
              selected={activeMenuItem === item.id}
              onClick={() => handleItemClick(item)}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.3,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.12)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.04)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        <List>
          <ListItemButton onClick={onLogout} sx={{ borderRadius: 2, mx: 1 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <ExitToAppIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
};