import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
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
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { GlassCard } from '../styled';
import { ApiFile } from '../../api/client';

interface FileCardProps {
  file: ApiFile;
  onSelect: (file: ApiFile) => void;
  onAction: (action: string, file: ApiFile) => void;
  onViewContent: (file: ApiFile) => void;
  searchScore?: number;
  contentPreview?: string;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onSelect, onAction, onViewContent }) => {
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

  const handleViewContent = () => {
    onViewContent(file);
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
    <Box sx={{ width: '100%', maxWidth: 380, minWidth: 240 }}>
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
            background: `linear-gradient(135deg, rgba(26, 31, 54, 0.95) 0%, rgba(26, 31, 54, 0.9) 100%)`,
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }
        }}
      >
        <MenuItem onClick={() => handleAction('download')}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleViewContent}>
          <ListItemIcon><CodeIcon fontSize="small" /></ListItemIcon>
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