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
  Stack,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Folder as FolderIcon,
  CloudUpload as UploadIcon,
  Timeline as TimelineIcon,
  SpeedSharp as CpuIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

import { Container } from '../../api/client';
import { useUploadFile } from '../../hooks/useApi';

interface ContainerCardProps {
  container: Container;
  onSelect: (container: Container) => void;
  onAction: (action: string, container: Container) => void;
}

const formatBytes = (mb: number): string => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: Container['status']): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'running': return 'success';
    case 'stopped': return 'warning';
    case 'error': return 'error';
    case 'starting': return 'info';
    default: return 'info';
  }
};

const getStatusLabel = (status: Container['status'] | undefined): string => {
  const labels: Record<Container['status'], string> = {
    running: 'Running',
    stopped: 'Stopped',
    error: 'Error',
    starting: 'Starting',
  };
  return status ? labels[status] : 'Unknown';
};

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

  const handleMenuClose = () => setMenuAnchor(null);

  const handleAction = (action: string) => {
    onAction(action, container);
    handleMenuClose();
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    try {
      await uploadFileMutation.mutateAsync({ containerId: container.id, file });
      setUploadStatus({ open: true, success: true, message: `File "${file.name}" uploaded successfully` });
    } catch (error) {
      setUploadStatus({ 
        open: true, 
        success: false, 
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }, [container.id, uploadFileMutation]);

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
      if (files?.[0]) {
        const file = files[0];
        try {
          await uploadFileMutation.mutateAsync({ containerId: container.id, file });
          setUploadStatus({ open: true, success: true, message: `File "${file.name}" uploaded successfully` });
        } catch {
          setUploadStatus({ open: true, success: false, message: 'Upload failed' });
        }
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const handleCloseSnackbar = () => setUploadStatus({ open: false });

  const statusColor = getStatusColor(container.status);
  const memoryPercent = Math.min(container.memory_usage, 100);
  const cpuPercent = Math.min(container.cpu_usage, 100);

  return (
    <Box sx={{ width: '100%', maxWidth: 380 }} {...getRootProps()}>
      <input {...getInputProps()} />
      
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.995 }}
      >
        <Box
          onClick={() => onSelect(container)}
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${dragOver ? '#00CFE8' : 'rgba(255,255,255,0.08)'}`,
            bgcolor: dragOver ? 'rgba(0, 207, 232, 0.05)' : 'rgba(255,255,255,0.03)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease',
            '&:hover': {
              border: '1px solid rgba(255,255,255,0.2)',
              bgcolor: 'rgba(255,255,255,0.05)',
            },
          }}
        >
          {/* Drag overlay */}
          {dragOver && (
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(0, 207, 232, 0.1)', zIndex: 1,
            }}>
              <Box sx={{ textAlign: 'center', color: '#00CFE8' }}>
                <UploadIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2" fontWeight="600">Drop file to upload</Typography>
              </Box>
            </Box>
          )}

          {/* Production badge */}
          {container.env_label.value === 'prod' && (
            <Chip label="PROD" color="error" size="small" sx={{ position: 'absolute', top: 8, right: 8, fontWeight: 700, height: 20 }} />
          )}

          <CardContent sx={{ p: 0 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: statusColor === 'success' ? '#4caf50' :
                             statusColor === 'warning' ? '#ff9800' :
                             statusColor === 'error' ? '#f44336' : '#2196f3',
                    animation: container.status === 'running' ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
                  }} />
                  <Typography variant="subtitle2" fontWeight="600" color="text.primary" noWrap>
                    {container.id}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={getStatusLabel(container.status)} 
                    color={statusColor} 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500 }} 
                  />
                  <Chip 
                    label={container.env_label.value} 
                    variant="outlined" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem', borderColor: 'rgba(255,255,255,0.2)' }} 
                  />
                  <Chip 
                    label={container.type_label.value} 
                    variant="outlined" 
                    size="small" 
                    sx={{ height: 20, fontSize: '0.65rem', borderColor: 'rgba(255,255,255,0.2)' }} 
                  />
                </Box>
              </Box>
              
              <IconButton size="small" onClick={handleMenuOpen} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Resource Usage */}
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {/* Memory */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MemoryIcon fontSize="small" sx={{ opacity: 0.7, fontSize: '1rem' }} />
                    <Typography variant="caption" color="text.secondary">Memory</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight="600">{memoryPercent}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={memoryPercent} 
                  color={memoryPercent > 85 ? 'error' : memoryPercent > 70 ? 'warning' : 'primary'}
                  sx={{ height: 5, borderRadius: 2.5, '& .MuiLinearProgress-bar': { transition: 'width 0.3s ease' } }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                  {formatBytes(container.memory_limit)} limit
                </Typography>
              </Box>

              {/* CPU */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CpuIcon fontSize="small" sx={{ opacity: 0.7, fontSize: '1rem' }} />
                    <Typography variant="caption" color="text.secondary">CPU Usage</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight="600">{cpuPercent}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={cpuPercent} 
                  color={cpuPercent > 85 ? 'error' : cpuPercent > 70 ? 'warning' : 'primary'}
                  sx={{ height: 5, borderRadius: 2.5 }}
                />
              </Box>
            </Stack>

            {/* Limits Grid */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 1, 
              p: 1.5, 
              bgcolor: 'rgba(255,255,255,0.03)', 
              borderRadius: 1.5,
              mb: 2,
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <StorageIcon fontSize="small" sx={{ opacity: 0.7, mb: 0.25 }} />
                <Typography variant="caption" fontWeight="600" display="block">{formatBytes(container.storage_quota)}</Typography>
                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">Storage</Typography>
              </Box>
              <Box sx={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <FolderIcon fontSize="small" sx={{ opacity: 0.7, mb: 0.25 }} />
                <Typography variant="caption" fontWeight="600" display="block">{container.file_limit}</Typography>
                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">Max Files</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <TimelineIcon fontSize="small" sx={{ opacity: 0.7, mb: 0.25 }} />
                <Typography variant="caption" fontWeight="600" display="block">{formatDate(container.created_at)}</Typography>
                <Typography variant="caption" color="text.secondary" fontSize="0.65rem">Created</Typography>
              </Box>
            </Box>

            {/* Commands Preview */}
            {container.commands?.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Startup Commands
                </Typography>
                <Box sx={{ 
                  bgcolor: 'rgba(0,0,0,0.2)', 
                  borderRadius: 1, 
                  p: 1, 
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  maxHeight: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {container.commands.slice(0, 2).map((cmd, i) => (
                    <Typography key={i} variant="caption" color="text.primary" noWrap>
                      $ {cmd}
                    </Typography>
                  ))}
                  {container.commands.length > 2 && (
                    <Typography variant="caption" color="text.secondary">+{container.commands.length - 2} more</Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Privileged Badge */}
            {container.privileged && (
              <Chip 
                label="Privileged" 
                color="error" 
                variant="outlined" 
                size="small" 
                sx={{ height: 20, fontSize: '0.65rem' }} 
              />
            )}
          </CardContent>

          {/* Drag indicator */}
          {isDragActive && !dragOver && (
            <Box sx={{ position: 'absolute', bottom: 8, right: 8, width: 6, height: 6, borderRadius: '50%', bgcolor: '#00CFE8' }} />
          )}
        </Box>
      </motion.div>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: 'rgba(26, 31, 54, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            minWidth: 200,
          }
        }}
      >
        <MenuItem onClick={handleUploadClick}>
          <ListItemIcon><UploadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Upload File</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleAction('restart')}>
          <ListItemIcon><RefreshIcon fontSize="small" sx={{ color: 'info.main' }} /></ListItemIcon>
          <ListItemText>Restart</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('stop')} disabled={container.status !== 'running'}>
          <ListItemIcon><StopIcon fontSize="small" sx={{ color: 'warning.main' }} /></ListItemIcon>
          <ListItemText>Stop</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('delete')}>
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleAction('logs')}>
          <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Logs</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('settings')}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
      </Menu>

      {/* Upload Snackbar */}
      <Snackbar
        open={uploadStatus.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={uploadStatus.success ? 'success' : 'error'} variant="filled">
          {uploadStatus.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};