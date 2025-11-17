import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CardContent,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Delete,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { GlassCard, StatusIndicator, AnimatedChip } from '../styled';
import { Container } from '../../api/client';

interface ContainerCardProps {
  container: Container;
  onSelect: (container: Container) => void;
  onAction: (action: string, container: Container) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({ container, onSelect, onAction }) => {
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
            background: `linear-gradient(135deg, rgba(26, 31, 54, 0.95) 0%, rgba(26, 31, 54, 0.9) 100%)`,
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