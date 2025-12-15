import React, { useState, useEffect, useMemo, JSX } from 'react';
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
  TextField,
  Alert,
  Menu,
  MenuItem,
  Snackbar,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
} from '@mui/icons-material';
import { useFileContent, useDeleteFile, useUploadFile } from '../../hooks/useApi';
import { ApiFile } from '../../api/client';
import { useNotifications } from '../../hooks/useNotifications';

interface FileContentDialogProps {
  open: boolean;
  onClose: () => void;
  file: ApiFile | null;
  containerId: string;
  onFileUpdated?: () => void;
  onFileDeleted?: () => void;
  searchQuery?: string; // Добавляем пропс для поискового запроса из семантического поиска
}

export const FileContentDialog: React.FC<FileContentDialogProps> = ({ 
  open, 
  onClose, 
  file, 
  containerId,
  onFileUpdated,
  onFileDeleted,
  searchQuery: initialSearchQuery = '', // Значение по умолчанию
}) => {
  const { data: fileContent, isLoading, error, refetch } = useFileContent(
    containerId, 
    file?.name || ''
  );
  const deleteFileMutation = useDeleteFile();
  const uploadFileMutation = useUploadFile();
  const { addNotification } = useNotifications();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saveError, setSaveError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Новые состояния для поиска по контексту
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    if (fileContent?.content && !editedContent) {
      setEditedContent(fileContent.content);
    }
  }, [fileContent]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedContent('');
      setSaveError('');
      setAnchorEl(null);
      setShowDeleteConfirm(false);
      // Сбрасываем поиск при закрытии диалога
      setSearchQuery('');
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(false);
    }
  }, [open]);

  // При открытии диалога устанавливаем начальный поисковый запрос
  useEffect(() => {
    if (open && initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      setIsSearchActive(true);
    }
  }, [open, initialSearchQuery]);

  // Функция для поиска совпадений в тексте
  const findSearchMatches = useMemo(() => {
    if (!searchQuery.trim() || !editedContent) {
      return [];
    }

    const matches: number[] = [];
    const searchTerm = searchQuery.toLowerCase();
    const content = editedContent.toLowerCase();
    let position = content.indexOf(searchTerm);
    
    while (position !== -1) {
      matches.push(position);
      position = content.indexOf(searchTerm, position + 1);
    }
    
    return matches;
  }, [editedContent, searchQuery]);

  // Обновляем совпадения при изменении поискового запроса или содержимого
  useEffect(() => {
    const matches = findSearchMatches;
    setSearchMatches(matches);
    
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [findSearchMatches]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchActive(!!e.target.value.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setIsSearchActive(false);
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    
    setCurrentMatchIndex(prev => {
      const next = prev + 1;
      return next >= searchMatches.length ? 0 : next;
    });
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    
    setCurrentMatchIndex(prev => {
      const next = prev - 1;
      return next < 0 ? searchMatches.length - 1 : next;
    });
  };

  // Функция для получения текста с подсветкой
  const getHighlightedText = () => {
    if (!searchQuery.trim() || !editedContent || searchMatches.length === 0) {
      return editedContent;
    }

    const result: JSX.Element[] = [];
    let lastIndex = 0;
    const searchTerm = searchQuery;
    
    searchMatches.forEach((matchIndex, index) => {
      // Текст до совпадения
      const beforeMatch = editedContent.substring(lastIndex, matchIndex);
      if (beforeMatch) {
        result.push(<span key={`before-${index}`}>{beforeMatch}</span>);
      }
      
      // Подсвеченный текст
      const matchText = editedContent.substring(matchIndex, matchIndex + searchTerm.length);
      const isCurrent = index === currentMatchIndex;
      result.push(
        <mark 
          key={`match-${index}`}
          style={{
            backgroundColor: isCurrent ? '#ffeb3b' : 'rgba(255, 235, 59, 0.3)',
            color: isCurrent ? '#000' : 'inherit',
            padding: '0 2px',
            borderRadius: '2px',
            fontWeight: isCurrent ? 'bold' : 'normal',
            border: isCurrent ? '1px solid #ff9800' : 'none',
          }}
        >
          {matchText}
        </mark>
      );
      
      lastIndex = matchIndex + searchTerm.length;
    });
    
    // Остаток текста после последнего совпадения
    const afterLastMatch = editedContent.substring(lastIndex);
    if (afterLastMatch) {
      result.push(<span key="after-last">{afterLastMatch}</span>);
    }
    
    return result;
  };

  const handleCopyContent = async () => {
    if (editedContent) {
      try {
        await navigator.clipboard.writeText(editedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy content:', err);
      }
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!file || !containerId) return;

    setSaveError('');

    try {
      const blob = new Blob([editedContent], { type: file.mime_type || 'text/plain' });
      
      const newFile = new File([blob], file.name, { 
        type: file.mime_type || 'text/plain',
        lastModified: Date.now()
      });

      await deleteFileMutation.mutateAsync({
        fileId: containerId,
        containerId: file.name
      });

      await uploadFileMutation.mutateAsync({
        containerId: containerId,
        file: newFile,
      });

      addNotification({
        message: `File "${file.name}" updated successfully`,
        severity: 'success',
        open: true,
      });

      setIsEditing(false);

      if (onFileUpdated) {
        onFileUpdated();
      }

      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      setSaveError(errorMessage);
      addNotification({
        message: errorMessage,
        severity: 'error',
        open: true,
      });
    }
  };

  const handleDelete = async () => {
    if (!file || !containerId) return;

    try {
      await deleteFileMutation.mutateAsync({
        fileId: file.name,
        containerId: containerId,
      });

      addNotification({
        message: `File "${file.name}" deleted successfully`,
        severity: 'success',
        open: true,
      });

      onClose();
      
      if (onFileDeleted) {
        onFileDeleted();
      }
    } catch (error) {
      addNotification({
        message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = async () => {
    if (!file) return;
    
    try {
      const response = await fetch(`/api/containers/${containerId}/files/${file.name}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addNotification({
        message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
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
    <>
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
            {isTextFile && !isEditing && (
              <Tooltip title={copied ? "Copied!" : "Copy content"}>
                <IconButton onClick={handleCopyContent} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {isTextFile && (
              <Tooltip title={isEditing ? "Cancel edit" : "Edit file"}>
                <IconButton 
                  onClick={handleEditToggle} 
                  size="small"
                  color={isEditing ? "warning" : "default"}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="More actions">
              <IconButton onClick={handleMenuClick} size="small">
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        
        {/* Панель поиска */}
        {isTextFile && !isEditing && fileContent && (
          <Paper 
            elevation={0}
            sx={{
              p: 1,
              mx: 3,
              mt: 1,
              mb: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            <SearchIcon fontSize="small" sx={{ opacity: 0.7 }} />
            <TextField
              fullWidth
              variant="standard"
              placeholder="Search in file..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: '0.875rem',
                  color: 'text.primary',
                  '&::placeholder': {
                    color: 'text.secondary',
                  },
                }
              }}
              size="small"
            />
            
            {searchQuery && (
              <>
                <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.7 }}>
                  {searchMatches.length > 0 
                    ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                    : 'No matches'
                  }
                </Typography>
                
                <Tooltip title="Previous match">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={handlePrevMatch}
                      disabled={searchMatches.length === 0}
                      sx={{ opacity: searchMatches.length === 0 ? 0.3 : 0.7 }}
                    >
                      <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Tooltip title="Next match">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={handleNextMatch}
                      disabled={searchMatches.length === 0}
                      sx={{ opacity: searchMatches.length === 0 ? 0.3 : 0.7 }}
                    >
                      <NavigateNextIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Tooltip title="Clear search">
                  <IconButton size="small" onClick={handleClearSearch} sx={{ opacity: 0.7 }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Paper>
        )}
        
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
                onClick={handleDownload}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={getLanguageFromMimeType(file ? file.mime_type : "")}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {isSearchActive && searchMatches.length > 0 && (
                    <Chip 
                      label={`${searchMatches.length} match${searchMatches.length !== 1 ? 'es' : ''}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {fileContent.encoding} • {formatFileSize(fileContent.size)}
                </Typography>
              </Box>
              
              {isEditing ? (
                <Box sx={{ flex: 1, p: 0, minHeight: 0 }}>
                  {saveError && (
                    <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
                      {saveError}
                    </Alert>
                  )}
                  <TextField
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    multiline
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: '100%',
                        alignItems: 'flex-start',
                      },
                      '& .MuiOutlinedInput-input': {
                        fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        p: 3,
                      },
                    }}
                    InputProps={{
                      style: {
                        height: '100%',
                      }
                    }}
                  />
                </Box>
              ) : (
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
                    '& mark': {
                      transition: 'background-color 0.3s ease',
                    },
                  }}
                >
                  {getHighlightedText()}
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          p: 2,
          flexShrink: 0 
        }}>
          {isEditing ? (
            <>
              <Button onClick={handleEditToggle}>
                Cancel
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSave}
                startIcon={<SaveIcon />}
                disabled={deleteFileMutation.isPending || uploadFileMutation.isPending}
              >
                {deleteFileMutation.isPending || uploadFileMutation.isPending ? (
                  <CircularProgress size={24} />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose}>
                Close
              </Button>
              <Button 
                variant="contained" 
                onClick={handleDownload}
                startIcon={<DownloadIcon />}
              >
                Download
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Меню дополнительных действий */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleMenuClose();
          handleDownload();
        }}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleMenuClose();
          setShowDeleteConfirm(true);
        }} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete File
        </MenuItem>
      </Menu>

      {/* Подтверждение удаления */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{file?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error"
            variant="contained"
            disabled={deleteFileMutation.isPending}
          >
            {deleteFileMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};