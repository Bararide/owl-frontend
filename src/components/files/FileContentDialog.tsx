import React, { useState, useEffect, useMemo, JSX, useCallback } from 'react';
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
  Paper,
  Stack,
  Divider,
  Menu,
  MenuItem,
  Fade,
  InputAdornment,
  Switch,
  FormControlLabel,
  Badge,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  TextFields as TextFieldsIcon,
  WrapText as WrapTextIcon,
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
  searchQuery?: string;
  currentFileIndex?: number;
  totalFiles?: number;
  onNextFile?: () => void;
  onPrevFile?: () => void;
}

interface SearchMatch {
  word: string;
  positions: number[];
  color: string;
}

const MIME_TO_LANGUAGE: Record<string, string> = {
  'text/javascript': 'JavaScript',
  'application/json': 'JSON',
  'text/html': 'HTML',
  'text/css': 'CSS',
  'text/x-python': 'Python',
  'text/x-java': 'Java',
  'text/x-c++': 'C++',
  'text/x-c': 'C',
  'text/x-ruby': 'Ruby',
  'text/x-php': 'PHP',
  'text/x-go': 'Go',
  'text/x-rust': 'Rust',
  'text/x-typescript': 'TypeScript',
  'text/x-yaml': 'YAML',
  'text/x-markdown': 'Markdown',
  'text/plain': 'Text',
};

// Цвета для выделения разных слов
const HIGHLIGHT_COLORS = [
  'rgba(255, 235, 59, 0.3)',   // желтый
  'rgba(76, 175, 80, 0.3)',    // зеленый
  'rgba(33, 150, 243, 0.3)',   // синий
  'rgba(156, 39, 176, 0.3)',   // фиолетовый
  'rgba(255, 87, 34, 0.3)',    // оранжевый
  'rgba(233, 30, 99, 0.3)',    // розовый
  'rgba(0, 188, 212, 0.3)',    // голубой
  'rgba(139, 195, 74, 0.3)',   // светло-зеленый
];

export const FileContentDialog: React.FC<FileContentDialogProps> = ({ 
  open, 
  onClose, 
  file, 
  containerId,
  onFileUpdated,
  onFileDeleted,
  searchQuery: initialSearchQuery = '',
  currentFileIndex = 0,
  totalFiles = 0,
  onNextFile,
  onPrevFile,
}) => {
  // Hooks
  const { 
    data: fileContent, 
    isLoading, 
    error, 
    refetch 
  } = useFileContent(containerId, file?.name || '');
  
  const deleteFileMutation = useDeleteFile();
  const uploadFileMutation = useUploadFile();
  const { addNotification } = useNotifications();

  // State
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saveError, setSaveError] = useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchWords, setSearchWords] = useState<string[]>([]);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  // Computed values
  const isTextFile = file?.mime_type?.startsWith('text/') || file?.mime_type === 'application/json';

  // Парсинг поискового запроса на отдельные слова
  const parseSearchQuery = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    
    // Разбиваем на слова, игнорируя лишние пробелы
    const words = searchQuery
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    return words;
  }, [searchQuery]);

  // Поиск совпадений для каждого слова
  const findSearchMatches = useMemo(() => {
    if (!searchQuery.trim() || !editedContent || parseSearchQuery.length === 0) {
      return [];
    }

    const words = parseSearchQuery;
    const matches: SearchMatch[] = [];
    const content = matchCase ? editedContent : editedContent.toLowerCase();
    
    words.forEach((word, wordIndex) => {
      const searchTerm = matchCase ? word : word.toLowerCase();
      const positions: number[] = [];
      
      if (wholeWord) {
        // Поиск целых слов с границами
        const regex = new RegExp(
          `\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 
          matchCase ? 'g' : 'gi'
        );
        let match;
        while ((match = regex.exec(editedContent)) !== null) {
          positions.push(match.index);
        }
      } else {
        // Обычный поиск
        let position = content.indexOf(searchTerm);
        while (position !== -1) {
          positions.push(position);
          position = content.indexOf(searchTerm, position + 1);
        }
      }
      
      if (positions.length > 0) {
        matches.push({
          word,
          positions,
          color: HIGHLIGHT_COLORS[wordIndex % HIGHLIGHT_COLORS.length],
        });
      }
    });
    
    return matches;
  }, [editedContent, searchQuery, parseSearchQuery, matchCase, wholeWord]);

  // Общее количество совпадений
  const totalMatches = useMemo(() => {
    return searchMatches.reduce((sum, match) => sum + match.positions.length, 0);
  }, [searchMatches]);

  // Эффекты
  useEffect(() => {
    if (file?.name && open) {
      resetState();
      setSearchQuery(initialSearchQuery);
      setIsSearchActive(!!initialSearchQuery);
      setTimeout(() => refetch(), 100);
    }
  }, [file?.name, initialSearchQuery, open, refetch]);

  useEffect(() => {
    if (fileContent?.content && !editedContent) {
      setEditedContent(fileContent.content);
    }
  }, [fileContent, editedContent, file?.name]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    const matches = findSearchMatches;
    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 && matches[0].positions.length > 0 ? 0 : -1);
  }, [findSearchMatches]);

  // Helper functions
  const resetState = () => {
    setIsEditing(false);
    setEditedContent('');
    setSaveError('');
    setActionMenuAnchor(null);
    setShowDeleteConfirm(false);
    setSearchQuery('');
    setSearchWords([]);
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setIsSearchActive(false);
    setCopied(false);
    setMatchCase(false);
    setWholeWord(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLanguageFromMimeType = (mimeType: string): string => {
    return MIME_TO_LANGUAGE[mimeType] || 'Text';
  };

  // Event handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchActive(!!e.target.value.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchWords([]);
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setIsSearchActive(false);
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    
    setCurrentMatchIndex(prev => {
      const next = prev + 1;
      return next >= totalMatches ? 0 : next;
    });
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    
    setCurrentMatchIndex(prev => {
      const next = prev - 1;
      return next < 0 ? totalMatches - 1 : next;
    });
  };

  const handleCopyContent = useCallback(async () => {
    if (editedContent) {
      try {
        await navigator.clipboard.writeText(editedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        addNotification({
          message: 'Content copied to clipboard',
          severity: 'success',
          open: true,
        });
      } catch (err) {
        console.error('Failed to copy content:', err);
        addNotification({
          message: 'Failed to copy content',
          severity: 'error',
          open: true,
        });
      }
    }
  }, [editedContent, addNotification]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setSaveError('');
  };

  const handleSave = useCallback(async () => {
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
      onFileUpdated?.();
      onClose();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      setSaveError(errorMessage);
      addNotification({
        message: errorMessage,
        severity: 'error',
        open: true,
      });
    }
  }, [file, containerId, editedContent, deleteFileMutation, uploadFileMutation, addNotification, onFileUpdated, onClose]);

  const handleDelete = useCallback(async () => {
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
      onFileDeleted?.();
    } catch (error) {
      addNotification({
        message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  }, [file, containerId, deleteFileMutation, addNotification, onClose, onFileDeleted]);

  const handleDownload = useCallback(async () => {
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
      
      addNotification({
        message: `File "${file.name}" downloaded`,
        severity: 'success',
        open: true,
      });
    } catch (error) {
      addNotification({
        message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  }, [file, containerId, addNotification]);

  // Функция для получения следующего индекса совпадения
  const getNextMatchIndex = (currentPos: number): number => {
    let matchCounter = -1;
    
    for (const match of searchMatches) {
      for (const pos of match.positions) {
        matchCounter++;
        if (pos > currentPos) {
          return matchCounter;
        }
      }
    }
    
    return 0; // Возвращаемся к первому совпадению
  };

  // Функция для получения позиции совпадения по глобальному индексу
  const getMatchPositionByGlobalIndex = (globalIndex: number): { word: string; position: number; color: string } | null => {
    if (globalIndex < 0 || globalIndex >= totalMatches) {
      return null;
    }
    
    let counter = 0;
    for (const match of searchMatches) {
      for (const pos of match.positions) {
        if (counter === globalIndex) {
          return {
            word: match.word,
            position: pos,
            color: match.color,
          };
        }
        counter++;
      }
    }
    
    return null;
  };

  // Функция для подсветки текста
  const getHighlightedText = () => {
    if (!searchQuery.trim() || !editedContent || searchMatches.length === 0) {
      return editedContent;
    }

    // Собираем все позиции для выделения
    const highlightRanges: Array<{
      start: number;
      end: number;
      color: string;
      word: string;
      isCurrent: boolean;
    }> = [];

    searchMatches.forEach(match => {
      match.positions.forEach(pos => {
        highlightRanges.push({
          start: pos,
          end: pos + match.word.length,
          color: match.color,
          word: match.word,
          isCurrent: false, // Будет установлено позже
        });
      });
    });

    // Сортируем по начальной позиции
    highlightRanges.sort((a, b) => a.start - b.start);

    // Определяем текущее совпадение
    if (currentMatchIndex >= 0 && currentMatchIndex < highlightRanges.length) {
      highlightRanges[currentMatchIndex].isCurrent = true;
    }

    // Строим результат
    const result: JSX.Element[] = [];
    let lastIndex = 0;

    highlightRanges.forEach((range, index) => {
      // Добавляем текст до совпадения
      if (range.start > lastIndex) {
        result.push(
          <span key={`text-${index}`}>
            {editedContent.substring(lastIndex, range.start)}
          </span>
        );
      }

      // Добавляем выделенное совпадение
      const matchText = editedContent.substring(range.start, range.end);
      result.push(
        <mark
          key={`match-${index}`}
          style={{
            backgroundColor: range.color,
            color: 'inherit',
            padding: '0 2px',
            borderRadius: '3px',
            fontWeight: range.isCurrent ? 'bold' : 'normal',
            border: range.isCurrent ? '2px solid #ff9800' : 'none',
            boxShadow: range.isCurrent ? '0 0 8px rgba(255, 152, 0, 0.5)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {matchText}
        </mark>
      );

      lastIndex = range.end;
    });

    // Добавляем оставшийся текст
    if (lastIndex < editedContent.length) {
      result.push(
        <span key="text-last">
          {editedContent.substring(lastIndex)}
        </span>
      );
    }

    return result;
  };

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
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minHeight: '70vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {/* Enhanced Header */}
        <DialogTitle sx={{ 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(115, 103, 240, 0.05) 0%, rgba(115, 103, 240, 0.02) 100%)',
        }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            {/* Navigation Controls */}
            {totalFiles > 1 && (
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Previous file (Ctrl/Cmd + ←)">
                  <IconButton 
                    onClick={onPrevFile}
                    size="small"
                    sx={{ 
                      border: '1px solid rgba(255,255,255,0.1)',
                      '&:hover': { backgroundColor: 'rgba(115, 103, 240, 0.1)' }
                    }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next file (Ctrl/Cmd + →)">
                  <IconButton 
                    onClick={onNextFile}
                    size="small"
                    sx={{ 
                      border: '1px solid rgba(255,255,255,0.1)',
                      '&:hover': { backgroundColor: 'rgba(115, 103, 240, 0.1)' }
                    }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
            
            {/* File Info */}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" component="div" noWrap sx={{ fontWeight: 600 }}>
                {file?.name || file?.path.split('/').pop()}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" color="text.secondary" noWrap>
                  {file?.path}
                </Typography>
                {file && (
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                  </Typography>
                )}
                {totalFiles > 1 && (
                  <Typography variant="caption" color="text.secondary">
                    File {currentFileIndex + 1} of {totalFiles}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
          
          {/* Action Buttons */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {isTextFile && (
              <>
                <Tooltip title={copied ? "Copied!" : "Copy content"}>
                  <IconButton 
                    onClick={handleCopyContent} 
                    size="small"
                    color={copied ? "success" : "default"}
                  >
                    {copied ? <CheckCircleIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={isEditing ? "Cancel edit" : "Edit file"}>
                  <IconButton 
                    onClick={handleEditToggle} 
                    size="small"
                    color={isEditing ? "warning" : "default"}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            
            <Tooltip title="More actions">
              <IconButton 
                onClick={(e) => setActionMenuAnchor(e.currentTarget)} 
                size="small"
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        {/* Enhanced Search Panel */}
        {isTextFile && !isEditing && (
          <Paper 
            elevation={0}
            sx={{
              mx: 3,
              mt: 2,
              mb: 1,
              borderRadius: 2,
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <Stack sx={{ p: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Search within file (separate words with spaces)..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  InputProps={{
                    disableUnderline: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ opacity: 0.7, mr: 1 }} />
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: '0.875rem',
                      '& input::placeholder': { 
                        color: 'text.secondary',
                        opacity: 0.7
                      },
                    }
                  }}
                  size="small"
                />
                
                {searchQuery && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                    <Badge 
                      badgeContent={parseSearchQuery.length} 
                      color="primary"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}
                    >
                      <TextFieldsIcon fontSize="small" sx={{ opacity: 0.7 }} />
                    </Badge>
                    
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.8, minWidth: 'fit-content' }}>
                      {totalMatches > 0 
                        ? `${currentMatchIndex + 1}/${totalMatches}`
                        : 'No matches'
                      }
                    </Typography>
                    
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Previous match">
                        <span>
                          <IconButton 
                            size="small" 
                            onClick={handlePrevMatch}
                            disabled={totalMatches === 0}
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
                            disabled={totalMatches === 0}
                          >
                            <NavigateNextIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      
                      <Tooltip title="Clear search">
                        <IconButton size="small" onClick={handleClearSearch}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                )}
              </Stack>
              
              {/* Search Options */}
              {searchQuery && (
                <Fade in={!!searchQuery}>
                  <Stack direction="row" spacing={2} sx={{ mt: 1, ml: 4 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={matchCase}
                          onChange={(e) => setMatchCase(e.target.checked)}
                        />
                      }
                      label={<Typography variant="caption">Match case</Typography>}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={wholeWord}
                          onChange={(e) => setWholeWord(e.target.checked)}
                        />
                      }
                      label={<Typography variant="caption">Whole word</Typography>}
                    />
                  </Stack>
                </Fade>
              )}
              
              {/* Search Words Chips */}
              {searchQuery && parseSearchQuery.length > 0 && (
                <Fade in={parseSearchQuery.length > 0}>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, ml: 4, flexWrap: 'wrap', gap: 1 }}>
                    {parseSearchQuery.map((word, index) => {
                      const match = searchMatches.find(m => m.word === word);
                      return (
                        <Chip
                          key={index}
                          label={word}
                          size="small"
                          sx={{
                            backgroundColor: match ? match.color : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: match ? 500 : 400,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Fade>
              )}
            </Stack>
          </Paper>
        )}
        
        {/* Content Area */}
        <DialogContent sx={{ 
          p: 0, 
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
              flex: 1,
              minHeight: 200
            }}>
              <Stack alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Loading file content...
                </Typography>
              </Stack>
            </Box>
          ) : error ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              flex: 1,
              textAlign: 'center',
              color: 'text.secondary',
              p: 4
            }}>
              <CodeIcon sx={{ fontSize: 96, mb: 2, opacity: 0.3 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>
                Unable to Load File
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 400 }}>
                {error instanceof Error ? error.message : 'An unknown error occurred while loading the file'}
              </Typography>
            </Box>
          ) : !isTextFile ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              flex: 1,
              textAlign: 'center',
              color: 'text.secondary',
              p: 4
            }}>
              <DescriptionIcon sx={{ fontSize: 96, mb: 3, opacity: 0.3 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>
                Binary File Preview
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, maxWidth: 400 }}>
                This file type cannot be displayed in the text viewer. Download the file to view its contents with an appropriate application.
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ borderRadius: 2 }}
              >
                Download File
              </Button>
            </Box>
          ) : fileContent && editedContent ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* File Metadata Bar */}
              <Paper elevation={0} sx={{ 
                mx: 3,
                mb: 1,
                borderRadius: 1,
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Chip 
                      label={getLanguageFromMimeType(file ? file.mime_type : "")}
                      size="small"
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 500 }}
                    />
                    {isSearchActive && searchMatches.length > 0 && (
                      <Chip 
                        icon={<SearchIcon />}
                        label={`${totalMatches} match${totalMatches !== 1 ? 'es' : ''} for ${parseSearchQuery.length} word${parseSearchQuery.length !== 1 ? 's' : ''}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                    {isEditing && (
                      <Chip 
                        icon={<EditIcon />}
                        label="Editing"
                        size="small"
                        color="warning"
                        variant="filled"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {fileContent.encoding} • {formatFileSize(fileContent.size)} • {editedContent.split('\n').length} lines
                  </Typography>
                </Stack>
              </Paper>
              
              {/* Save Error Alert */}
              {saveError && (
                <Alert severity="error" sx={{ mx: 3, mb: 2 }} onClose={() => setSaveError('')}>
                  {saveError}
                </Alert>
              )}
              
              {/* Content Display/Editor */}
              {isEditing ? (
                <Box sx={{ flex: 1, mx: 3, mb: 3 }}>
                  <TextField
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    multiline
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: '100%',
                        alignItems: 'flex-start',
                        borderRadius: 2,
                      },
                      '& .MuiOutlinedInput-input': {
                        fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        p: 3,
                        height: '100% !important',
                        overflow: 'auto !important',
                      },
                    }}
                    InputProps={{ style: { height: '100%' } }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 3,
                    mx: 3,
                    mb: 3,
                    fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    overflow: 'auto',
                    flex: 1,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    '&::-webkit-scrollbar': { width: 8, height: 8 },
                    '&::-webkit-scrollbar-track': { 
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 4
                    },
                    '&::-webkit-scrollbar-thumb': { 
                      background: 'rgba(255,255,255,0.2)', 
                      borderRadius: 4,
                      '&:hover': {
                        background: 'rgba(255,255,255,0.3)'
                      }
                    },
                    '& mark': { 
                      transition: 'all 0.2s ease',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      '&:hover': {
                        filter: 'brightness(1.1)',
                      }
                    },
                  }}
                  onClick={(e) => {
                    // Опционально: переход к следующему совпадению при клике на выделение
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'MARK') {
                      // Можно добавить логику для перехода к следующему совпадению
                    }
                  }}
                >
                  {getHighlightedText()}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        
        {/* Enhanced Actions */}
        <DialogActions sx={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          p: 3,
          flexShrink: 0,
          background: 'rgba(0,0,0,0.1)'
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
            <Box>
              {isEditing && (
                <Typography variant="caption" color="text.secondary">
                  Press Ctrl/Cmd + S to save • ESC to cancel
                </Typography>
              )}
            </Box>
            
            <Stack direction="row" spacing={1.5}>
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleEditToggle}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                    disabled={deleteFileMutation.isPending || uploadFileMutation.isPending}
                    sx={{ borderRadius: 2, minWidth: 120 }}
                  >
                    {deleteFileMutation.isPending || uploadFileMutation.isPending ? (
                      <CircularProgress size={20} sx={{ color: 'white' }} />
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={onClose}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  >
                    Close
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleDownload}
                    startIcon={<DownloadIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    Download
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Enhanced Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            minWidth: 180
          }
        }}
      >
        <MenuItem onClick={() => {
          setActionMenuAnchor(null);
          handleDownload();
        }}>
          <DownloadIcon fontSize="small" sx={{ mr: 1.5 }} />
          Download File
        </MenuItem>
        
        {isTextFile && (
          <MenuItem onClick={() => {
            setActionMenuAnchor(null);
            handleCopyContent();
          }}>
            <ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />
            Copy Content
          </MenuItem>
        )}
        
        <Divider sx={{ my: 1 }} />
        
        <MenuItem 
          onClick={() => {
            setActionMenuAnchor(null);
            setShowDeleteConfirm(true);
          }} 
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete File
        </MenuItem>
      </Menu>

      {/* Enhanced Delete Confirmation */}
      <Dialog 
        open={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Delete File</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete <strong>"{file?.name}"</strong>? 
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setShowDeleteConfirm(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setShowDeleteConfirm(false);
              handleDelete();
            }} 
            color="error"
            variant="contained"
            disabled={deleteFileMutation.isPending}
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            {deleteFileMutation.isPending ? (
              <CircularProgress size={20} sx={{ color: 'white' }} />
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};