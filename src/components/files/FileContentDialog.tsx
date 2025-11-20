import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useFileContent } from '../../hooks/useApi';
import { ApiFile } from '../../api/client';

interface FileContentDialogProps {
  open: boolean;
  onClose: () => void;
  file: ApiFile | null;
  containerId: string;
}

export const FileContentDialog: React.FC<FileContentDialogProps> = ({ 
  open, 
  onClose, 
  file, 
  containerId 
}) => {
  const { data: fileContent, isLoading, error } = useFileContent(
    containerId, 
    file?.name || ''
  );

  const [copied, setCopied] = useState(false);

  const handleCopyContent = async () => {
    if (fileContent?.content) {
      try {
        await navigator.clipboard.writeText(fileContent.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy content:', err);
      }
    }
  };

  const getLanguageFromMimeType = (mimeType: string): string => {
    const mimeToLang: Record<string, string> = {
      'text/javascript': 'javascript',
      'application/json': 'json',
      'text/html': 'html',
      'text/css': 'css',
      'text/x-python': 'python',
      'text/x-java': 'java',
      'text/x-c++': 'cpp',
      'text/x-c': 'c',
      'text/x-ruby': 'ruby',
      'text/x-php': 'php',
      'text/x-go': 'go',
      'text/x-rust': 'rust',
      'text/x-typescript': 'typescript',
      'text/x-yaml': 'yaml',
      'text/x-markdown': 'markdown',
      'text/plain': 'text',
    };
    
    return mimeToLang[mimeType] || 'text';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isTextFile = file?.mime_type?.startsWith('text/') || 
                    file?.mime_type === 'application/json';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, rgba(26, 31, 54, 0.98) 0%, rgba(26, 31, 54, 0.95) 100%)`,
          backdropFilter: 'blur(20px)',
          minHeight: '60vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        pb: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" component="div" noWrap>
            {file?.name || file?.path.split('/').pop()}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {file?.path} • {file && formatFileSize(file.size)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, ml: 1 }}>
          {isTextFile && (
            <Tooltip title={copied ? "Copied!" : "Copy content"}>
              <IconButton onClick={handleCopyContent} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: 0, 
        position: 'relative', 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        {isLoading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1 
          }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1,
            color: 'text.secondary'
          }}>
            <CodeIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Unable to load file content
            </Typography>
            <Typography variant="body2">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </Typography>
          </Box>
        ) : !isTextFile ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1,
            color: 'text.secondary'
          }}>
            <DescriptionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Binary File
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', maxWidth: 400 }}>
              This file type cannot be displayed in the viewer. 
              Please download the file to view its contents.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              sx={{ mt: 2 }}
            >
              Download File
            </Button>
          </Box>
        ) : fileContent ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Box sx={{ 
              position: 'sticky', 
              top: 0, 
              background: 'rgba(0,0,0,0.3)', 
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              px: 3,
              py: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 1,
              flexShrink: 0
            }}>
              <Chip 
                label={getLanguageFromMimeType(file ? file.mime_type : "")}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {fileContent.encoding} • {formatFileSize(fileContent.size)}
              </Typography>
            </Box>
            <Box
              component="pre"
              sx={{
                p: 3,
                m: 0,
                fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                background: 'rgba(0,0,0,0.2)',
                overflow: 'auto',
                flex: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                wordWrap: 'break-word',
                '&::-webkit-scrollbar': {
                  width: 8,
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255,255,255,0.05)',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 4,
                },
              }}
            >
              {fileContent.content}
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      
      <DialogActions sx={{ 
        borderTop: '1px solid rgba(255,255,255,0.1)', 
        p: 2,
        flexShrink: 0 
      }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button 
          variant="contained" 
          startIcon={<DownloadIcon />}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};