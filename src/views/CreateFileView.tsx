import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Create as CreateIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { Container } from '../api/client';
import { useNotifications } from '../hooks/useNotifications';
import { useUploadFile } from '../hooks/useApi';

interface CreateTxtFileViewProps {
  open: boolean;
  onClose: () => void;
  selectedContainer: Container | null;
  onFileCreated?: () => void;
}

export const CreateTxtFileView: React.FC<CreateTxtFileViewProps> = ({
  selectedContainer,
  onFileCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<{ fileName?: string; content?: string }>({});
  const { addNotification } = useNotifications();
  const uploadFileMutation = useUploadFile();

  const handleOpen = () => {
    if (!selectedContainer) {
      addNotification({
        message: 'Please select a container first',
        severity: 'warning',
        open: true,
      });
      return;
    }
    setOpen(true);
    setFileName('');
    setContent('');
    setErrors({});
  };

  const handleClose = () => {
    setOpen(false);
    setFileName('');
    setContent('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { fileName?: string; content?: string } = {};

    if (!fileName.trim()) {
      newErrors.fileName = 'File name is required';
    } else if (!/^[a-zA-Z0-9_\-\.\s]+$/.test(fileName)) {
      newErrors.fileName = 'Invalid file name. Use only letters, numbers, spaces, dots, hyphens and underscores';
    } else if (!fileName.endsWith('.txt')) {
      newErrors.fileName = 'File name must end with .txt extension';
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createTextFile = async () => {
    if (!selectedContainer || !validateForm()) {
      return;
    }

    try {
      // Создаем Blob из текстового содержимого
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Создаем File объект из Blob
      const file = new File([blob], fileName, { 
        type: 'text/plain',
        lastModified: Date.now()
      });

      // Используем существующий хук uploadFile
      await uploadFileMutation.mutateAsync({
        containerId: selectedContainer.id,
        file: file,
      });

      addNotification({
        message: `File "${fileName}" created successfully`,
        severity: 'success',
        open: true,
      });

      handleClose();
      
      if (onFileCreated) {
        onFileCreated();
      }
    } catch (error) {
      addNotification({
        message: `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFileName(value);
    
    // Auto-add .txt extension if not present
    if (value && !value.endsWith('.txt') && !value.includes('.')) {
      // Remove error if user is typing
      if (errors.fileName?.includes('extension')) {
        setErrors(prev => ({ ...prev, fileName: undefined }));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      createTextFile();
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<CreateIcon />}
        onClick={handleOpen}
        disabled={!selectedContainer}
        sx={{
          background: 'linear-gradient(135deg, #7367F0 0%, #CE9FFC 100%)',
          color: 'white',
          '&:hover': {
            background: 'linear-gradient(135deg, #6356E0 0%, #BE8FEC 100%)',
          },
          minWidth: '200px',
          mt: 4,
        }}
      >
        Create Text File
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.95) 0%, rgba(26, 31, 54, 0.9) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon />
          Create Text File
          {selectedContainer && (
            <Chip
              label={selectedContainer.id}
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ ml: 'auto' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {uploadFileMutation.isPending && (
          <LinearProgress />
        )}

        <DialogContent>
          {!selectedContainer ? (
            <Alert severity="warning">
              Please select a container first
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <TextField
                label="File Name"
                value={fileName}
                onChange={handleFileNameChange}
                error={!!errors.fileName}
                helperText={errors.fileName || 'Enter file name with .txt extension'}
                placeholder="example.txt"
                autoFocus
                fullWidth
                disabled={uploadFileMutation.isPending}
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>
                      .txt
                    </Typography>
                  ),
                }}
              />

              <Paper 
                variant="outlined" 
                sx={{ 
                  borderColor: errors.content ? 'error.main' : 'divider',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <Box sx={{ p: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Typography variant="caption" color={errors.content ? 'error' : 'text.secondary'}>
                    Content {errors.content && `- ${errors.content}`}
                  </Typography>
                </Box>
                <TextField
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyPress={handleKeyPress}
                  multiline
                  rows={12}
                  fullWidth
                  disabled={uploadFileMutation.isPending}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      border: 'none',
                      '& textarea': {
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                      },
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                  }}
                  placeholder="Enter file content here..."
                />
              </Paper>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Characters: {content.length}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  Press Ctrl+Enter to save
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button 
            onClick={handleClose}
            disabled={uploadFileMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createTextFile}
            disabled={uploadFileMutation.isPending || !selectedContainer}
            startIcon={<CreateIcon />}
            sx={{
              background: 'linear-gradient(135deg, #7367F0 0%, #CE9FFC 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #6356E0 0%, #BE8FEC 100%)',
              },
            }}
          >
            {uploadFileMutation.isPending ? 'Creating...' : 'Create File'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};