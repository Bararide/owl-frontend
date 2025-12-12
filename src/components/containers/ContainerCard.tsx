import React, { useState, useCallback } from 'react';
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
  Snackbar,
  Alert,
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
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { GlassCard, StatusIndicator, AnimatedChip } from '../styled';
import { Container } from '../../api/client';
import { useUploadFile } from '../../hooks/useApi';

interface ContainerCardProps {
  container: Container;
  onSelect: (container: Container) => void;
  onAction: (action: string, container: Container) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({ container, onSelect, onAction }) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ open: boolean; success?: boolean; message?: string }>({
    open: false,
  });

  const uploadFileMutation = useUploadFile();

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    try {
      await uploadFileMutation.mutateAsync({
        containerId: container.id,
        file: file,
      });

      setUploadStatus({
        open: true,
        success: true,
        message: `Файл "${file.name}" успешно загружен`,
      });
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      setUploadStatus({
        open: true,
        success: false,
        message: `Ошибка загрузки файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      });
    }
  }, [container.id, uploadFileMutation]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else if (content instanceof ArrayBuffer) {
          const bytes = new Uint8Array(content);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          resolve(btoa(binary));
        } else {
          reject(new Error('Не удалось прочитать содержимое файла'));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    multiple: false,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    onDropAccepted: () => setDragOver(false),
    onDropRejected: () => setDragOver(false),
  });

  const handleUploadClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const file = files[0];
        try {
          await uploadFileMutation.mutateAsync({
            containerId: container.id,
            file: file,
          });
          
          setUploadStatus({
            open: true,
            success: true,
            message: `Файл "${file.name}" успешно загружен`,
          });
        } catch (error) {
          console.error('Ошибка загрузки файла:', error);
          setUploadStatus({
            open: true,
            success: false,
            message: `Ошибка загрузки файла`,
          });
        }
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const handleCloseSnackbar = () => {
    setUploadStatus({ open: false });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 320, minWidth: 280 }} {...getRootProps()}>
      <input {...getInputProps()} />
      
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
            border: dragOver ? '2px dashed #00CFE8' : '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: dragOver ? 'rgba(0, 207, 232, 0.05)' : undefined,
            transition: 'all 0.2s ease',
          }}
        >
          {dragOver && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 207, 232, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  textAlign: 'center',
                  color: '#00CFE8',
                }}
              >
                <UploadIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2" fontWeight="600">
                  Перетащите файл для загрузки
                </Typography>
              </Box>
            </Box>
          )}

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

            {/* Индикатор drag & drop */}
            {isDragActive && !dragOver && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#00CFE8',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            )}
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
        <MenuItem onClick={handleUploadClick}>
          <ListItemIcon><UploadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Upload File</ListItemText>
        </MenuItem>
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

      <Snackbar
        open={uploadStatus.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={uploadStatus.success ? 'success' : 'error'}
          variant="filled"
        >
          {uploadStatus.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};