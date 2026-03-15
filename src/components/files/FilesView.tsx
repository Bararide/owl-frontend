import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Fade,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Divider,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  SmartToy as SemanticSearchIcon,
  Cached as RebuildIndexIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Lightbulb as LightbulbIcon,
  AutoAwesome as AutoAwesomeIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useFiles, useSemanticSearch, useRecommendationsStream } from '../../hooks/useApi';
import { useNotifications } from '../../hooks/useNotifications';
import { FileCard } from './FileCard';
import { FileContentDialog } from './FileContentDialog';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ApiFile } from '../../api/client';
import { apiClient } from '../../api/client';

interface FilesViewProps {
  containerId: string;
}

interface SearchResultFile extends ApiFile {
  score?: number;
  content_preview?: string;
}

interface RecommendationFile {
  path: string;
  name: string;
  isRecommended: boolean;
}

const SEARCH_SUGGESTIONS = [
  'authentication', 
  'database', 
  'error handling', 
  'API endpoints', 
  'configuration'
];

const DRAWER_WIDTH = 320;

export const FilesView: React.FC<FilesViewProps> = ({ containerId }) => {
  // API hooks
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(containerId);
  const { addNotification } = useNotifications();
  const semanticSearchMutation = useSemanticSearch();
  
  // Recommendations stream
  const { paths: recommendedPaths, isConnected: isRecommendationsConnected } = useRecommendationsStream(
    containerId,
    (newPaths) => {
      addNotification({
        message: `Found ${newPaths.length} recommended files`,
        severity: 'info',
        open: true,
      });
    },
    (finalPaths) => {
      addNotification({
        message: `Recommendations completed: ${finalPaths.length} files`,
        severity: 'success',
        open: true,
      });
    }
  );

  // State for file content dialog
  const [fileContentDialog, setFileContentDialog] = useState<{
    open: boolean;
    file: ApiFile | null;
    currentIndex: number;
  }>({
    open: false,
    file: null,
    currentIndex: 0,
  });

  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // State for file operations
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [rebuildNotification, setRebuildNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // State for recommendations drawer
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.mime_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentFilesList = (isSemanticSearch ? searchResults : (searchQuery ? filteredFiles : files)).reverse();

  const recommendationFiles: RecommendationFile[] = recommendedPaths.map(path => ({
    path,
    name: path.split('/').pop() || 'unknown',
    isRecommended: true,
  }));

  // Event handlers
  const handleSemanticSearch = useCallback(async (query: string) => {
    if (!query.trim() || !containerId) return;

    setIsSearching(true);
    setIsSemanticSearch(true);

    try {
      const result = await semanticSearchMutation.mutateAsync({
        query: query,
        container_id: containerId,
        limit: 50
      });

      const resultFiles: SearchResultFile[] = result.results
        .filter((searchResult): searchResult is { path: string; scope: number } => 
          searchResult.scope !== undefined
        )
        .map(searchResult => ({
          path: searchResult.path,
          name: searchResult.path.split('/').pop() || 'unknown',
          size: 0,
          container_id: containerId,
          user_id: '',
          created_at: new Date().toISOString(),
          mime_type: 'text/plain',
          score: searchResult.scope,
          content_preview: `Score: ${searchResult.scope.toFixed(2)}`
        }))
        .filter(file => {
          const systemFiles = ['container_config.json', 'access_policy.json'];
          return !systemFiles.includes(file.name);
        });

      setSearchResults(resultFiles);

      addNotification({
        message: `Found ${resultFiles.length} semantically relevant files`,
        severity: 'success',
        open: true,
      });

    } catch (error) {
      console.error('Semantic search error:', error);
      addNotification({
        message: `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
      setIsSemanticSearch(false);
    } finally {
      setIsSearching(false);
    }
  }, [containerId, semanticSearchMutation, addNotification]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    if (!value.trim()) {
      setIsSemanticSearch(false);
      setSearchResults([]);
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim() && containerId) {
      handleSemanticSearch(searchQuery);
    }
  }, [searchQuery, containerId, handleSemanticSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim() && containerId) {
      handleSearchSubmit();
    }
  }, [searchQuery, containerId, handleSearchSubmit]);

  const handleRefreshFiles = useCallback(async () => {
    if (!containerId) return;

    setIsRebuildingIndex(true);

    try {
      const result = await apiClient.getFilesRebuildIndex(containerId);
      
      refetchFiles();
      
      setRebuildNotification({
        open: true,
        message: `File index rebuilt successfully. Found ${result.length} files.`,
        severity: 'success',
      });

      addNotification({
        message: `File index rebuilt. ${result.length} files found.`,
        severity: 'success',
        open: true,
      });

    } catch (error) {
      console.error('Rebuild index error:', error);
      
      setRebuildNotification({
        open: true,
        message: `Failed to rebuild index: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });

      addNotification({
        message: `Failed to rebuild file index`,
        severity: 'error',
        open: true,
      });
      
      refetchFiles();
    } finally {
      setIsRebuildingIndex(false);
    }
  }, [containerId, refetchFiles, addNotification]);

  const handleDownloadFile = useCallback(async (file: ApiFile) => {
    try {
      addNotification({
        message: `Downloading file: ${file.name || file.path}`,
        severity: 'info',
        open: true,
      });

      const fileContent = await apiClient.getFileContent(containerId, file.name);
      
      const blob = new Blob([fileContent.content || ''], { 
        type: file.mime_type || 'application/octet-stream' 
      });
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addNotification({
        message: `File "${file.name || file.path}" downloaded successfully`,
        severity: 'success',
        open: true,
      });

    } catch (error) {
      console.error('Download error:', error);
      addNotification({
        message: `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  }, [containerId, addNotification]);

  const handleFileAction = useCallback((action: string, file: ApiFile) => {
    switch (action) {
      case 'download':
        handleDownloadFile(file);
        break;
      case 'view':
        const fileIndex = currentFilesList.findIndex(f => f.name === file.name);
        setFileContentDialog({ 
          open: true, 
          file: file,
          currentIndex: fileIndex
        });
        break;
      case 'delete':
        apiClient.deleteFile(file.container_id, file.name)
          .then(() => {
            addNotification({
              message: `File ${file.name || file.path} deleted successfully`,
              severity: 'success',
              open: true,
            });
            refetchFiles();
          })
          .catch((error) => {
            addNotification({
              message: `Failed to delete file: ${error.message}`,
              severity: 'error',
              open: true,
            });
          });
        break;
      default:
        addNotification({
          message: `${action} action performed on file`,
          severity: 'info',
          open: true,
        });
    }
  }, [addNotification, refetchFiles, handleDownloadFile, currentFilesList]);

  const handleViewContent = useCallback((file: ApiFile) => {
    const fileIndex = currentFilesList.findIndex(f => f.name === file.name);
    setFileContentDialog({ 
      open: true, 
      file: file,
      currentIndex: fileIndex
    });
  }, [currentFilesList]);

  const handleFileSelect = useCallback((file: ApiFile) => {
    addNotification({
      message: `Selected file: ${file.name || file.path}`,
      severity: 'success',
      open: true,
    });
  }, [addNotification]);

  const handleCloseFileContent = useCallback(() => {
    setFileContentDialog({ open: false, file: null, currentIndex: 0 });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSemanticSearch(false);
    setSearchResults([]);
  }, []);

  const handleRecommendationClick = useCallback(async (recommendation: RecommendationFile) => {
    try {
      // Создаем объект файла для рекомендации
      const recommendedFile: ApiFile = {
        path: recommendation.path,
        name: recommendation.name,
        size: 0,
        container_id: containerId,
        user_id: '',
        created_at: new Date().toISOString(),
        mime_type: 'text/plain',
      };

      // Открываем диалог с содержимым файла
      setFileContentDialog({
        open: true,
        file: recommendedFile,
        currentIndex: 0
      });

      addNotification({
        message: `Opening recommended file: ${recommendation.name}`,
        severity: 'info',
        open: true,
      });
    } catch (error) {
      addNotification({
        message: `Failed to open recommended file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  }, [containerId, addNotification]);

  // Navigation handlers
  const handleNextFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    
    const currentIndex = fileContentDialog.currentIndex;
    const nextIndex = (currentIndex + 1) % currentFilesList.length;
    
    setFileContentDialog({
      open: true,
      file: currentFilesList[nextIndex],
      currentIndex: nextIndex,
    });
  }, [fileContentDialog, currentFilesList]);

  const handlePrevFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    
    const currentIndex = fileContentDialog.currentIndex;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentFilesList.length - 1;
    
    setFileContentDialog({
      open: true,
      file: currentFilesList[prevIndex],
      currentIndex: prevIndex,
    });
  }, [fileContentDialog, currentFilesList]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fileContentDialog.open) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevFile();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextFile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileContentDialog.open, handleNextFile, handlePrevFile]);

  // Show recommendations when they arrive
  useEffect(() => {
    if (recommendationFiles.length > 0 && !isRecommendationsOpen) {
      setIsRecommendationsOpen(true);
    }
  }, [recommendationFiles.length, isRecommendationsOpen]);

  if (!containerId) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Container Selected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please select a container to view its files
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Recommendations Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={isRecommendationsOpen}
        sx={{
          width: isRecommendationsOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.95) 0%, rgba(26, 31, 54, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0 12px 12px 0',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recommendations
              </Typography>
            </Box>
            <IconButton 
              size="small" 
              onClick={() => setIsRecommendationsOpen(false)}
              sx={{ opacity: 0.7 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: isRecommendationsConnected ? 'success.main' : 'warning.main',
                animation: isRecommendationsConnected ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                }
              }} 
            />
            <Typography variant="caption" color="text.secondary">
              {isRecommendationsConnected ? 'Listening for recommendations' : 'Disconnected'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {recommendationFiles.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <LightbulbIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No recommendations yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Recommendations will appear here when you read files or perform semantic searches
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 1 }}>
              {recommendationFiles.map((recommendation, index) => (
                <ListItem key={`${recommendation.path}-${index}`} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleRecommendationClick(recommendation)}
                    sx={{
                      borderRadius: 2,
                      '&:hover': {
                        backgroundColor: 'rgba(115, 103, 240, 0.1)',
                      },
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FileIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                          {recommendation.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {recommendation.path}
                        </Typography>
                      }
                    />
                    <Chip
                      label="AI"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        backgroundColor: 'primary.main',
                        color: 'white',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {recommendationFiles.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
              {recommendationFiles.length} recommended file{recommendationFiles.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, transition: 'margin 0.3s', ml: isRecommendationsOpen ? 0 : 0 }}>
        {/* Notifications */}
        <Snackbar
          open={rebuildNotification.open}
          autoHideDuration={6000}
          onClose={() => setRebuildNotification(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            severity={rebuildNotification.severity} 
            onClose={() => setRebuildNotification(prev => ({ ...prev, open: false }))}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {rebuildNotification.message}
          </Alert>
        </Snackbar>

        {/* Header Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2 }}>
          {/* Recommendations Toggle Button */}
          <Button
            variant="outlined"
            startIcon={
              <Badge badgeContent={recommendationFiles.length} color="primary">
                <AutoAwesomeIcon />
              </Badge>
            }
            onClick={() => setIsRecommendationsOpen(!isRecommendationsOpen)}
            sx={{ mr: 2 }}
          >
            Recommendations
          </Button>

          {/* Search Form */}
          <Box 
            component="form" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            sx={{ 
              position: 'relative',
              maxWidth: 600,
              flex: 1,
              mr: 2,
              display: 'flex',
              gap: 1
            }}
          >
            <TextField
              fullWidth
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search files semantically by content..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SemanticSearchIcon 
                      sx={{ 
                        color: isSearchFocused ? 'primary.main' : 'text.secondary',
                        transition: 'color 0.2s ease'
                      }} 
                    />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={handleClearSearch}
                      sx={{ opacity: 0.6 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 2px 12px 0 rgba(0,0,0,0.15)',
                  },
                  ...(isSearchFocused && {
                    boxShadow: '0 2px 16px 0 rgba(115, 103, 240, 0.15)',
                    borderColor: 'primary.main',
                  })
                }
              }}
            />
            
            <Button
              variant="contained"
              onClick={handleSearchSubmit}
              disabled={!searchQuery.trim() || isSearching}
              startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ 
                minWidth: '120px',
                borderRadius: 2
              }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
            
            {/* Search Suggestions */}
            <Fade in={isSearchFocused && searchQuery.length > 0}>
              <Box sx={{ 
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                mt: 1,
                p: 2,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
                zIndex: 1000
              }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: '0.75rem' }}>
                  Semantic Search - finds files by meaning and context
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {SEARCH_SUGGESTIONS.map((filter) => (
                    <Chip
                      key={filter}
                      label={filter}
                      size="small"
                      clickable
                      onClick={() => {
                        setSearchQuery(filter);
                        handleSemanticSearch(filter);
                      }}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 24 }}
                    />
                  ))}
                </Box>
              </Box>
            </Fade>
          </Box>

          {/* Refresh Button */}
          <Tooltip title="Rebuild file index and refresh">
            <span>
              <Button 
                startIcon={isRebuildingIndex ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={handleRefreshFiles}
                variant="outlined"
                size="medium"
                disabled={isRebuildingIndex}
                sx={{
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white',
                  }
                }}
              >
                {isRebuildingIndex ? 'Rebuilding...' : 'Refresh'}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Info Panel */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          mx: 2,
          p: 2,
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {isSemanticSearch 
                ? `Semantic search results`
                : `Showing ${currentFilesList.length} of ${files.length} files`
              }
            </Typography>
            {isSemanticSearch && (
              <Chip 
                label="Semantic Search" 
                size="small" 
                color="primary" 
                variant="outlined"
                icon={<SemanticSearchIcon />}
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Last refresh: Click to rebuild index">
              <Chip
                icon={<RebuildIndexIcon />}
                label={`Index: ${files.length} files`}
                size="small"
                variant="outlined"
                onClick={handleRefreshFiles}
                clickable
              />
            </Tooltip>
          </Box>
        </Box>

        {/* Search Results Info */}
        {searchQuery && (
          <Box sx={{ mb: 2, mx: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              {isSemanticSearch 
                ? `Found ${searchResults.length} semantically relevant files for "${searchQuery}"`
                : `Found ${filteredFiles.length} files for "${searchQuery}"`
              }
            </Typography>
            {isSemanticSearch && (
              <Chip 
                label="Semantic Search" 
                size="small" 
                color="primary" 
                variant="outlined"
                icon={<SemanticSearchIcon />}
              />
            )}
            <Button 
              size="small" 
              onClick={handleClearSearch}
              startIcon={<CloseIcon />}
              sx={{ minWidth: 'auto', p: 0.5 }}
            >
              Clear
            </Button>
          </Box>
        )}

        {/* Main Content Area */}
        <Box sx={{ px: 2 }}>
          {isLoadingFiles ? (
            <LoadingSkeleton type="card" />
          ) : currentFilesList.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchQuery ? 'No Files Found' : 'No Files Found'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchQuery 
                  ? `No files match your ${isSemanticSearch ? 'semantic' : ''} search for "${searchQuery}"`
                  : 'This container doesn\'t have any files yet. Try rebuilding the index or uploading files.'
                }
              </Typography>
              {!searchQuery && (
                <Button 
                  variant="contained" 
                  onClick={handleRefreshFiles}
                  startIcon={<RefreshIcon />}
                  sx={{ mt: 2 }}
                  disabled={isRebuildingIndex}
                >
                  {isRebuildingIndex ? 'Rebuilding...' : 'Rebuild Index'}
                </Button>
              )}
              {searchQuery && (
                <Button 
                  variant="outlined" 
                  onClick={handleClearSearch}
                  sx={{ mt: 2 }}
                >
                  Clear Search
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 3,
              width: '100%'
            }}>
              {currentFilesList.map((file: SearchResultFile, index: number) => (
                <FileCard
                  key={`${file.name}-${file.score || ''}`}
                  file={file}
                  onSelect={handleFileSelect}
                  onAction={handleFileAction}
                  onViewContent={handleViewContent}
                  searchScore={file.score}
                  contentPreview={file.content_preview}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* File Content Dialog */}
        <FileContentDialog
          open={fileContentDialog.open}
          onClose={handleCloseFileContent}
          file={fileContentDialog.file}
          containerId={containerId}
          onFileUpdated={() => {
            handleRefreshFiles();
          }}
          onFileDeleted={() => {
            handleRefreshFiles();
          }}
          searchQuery={searchQuery}
          currentFileIndex={fileContentDialog.currentIndex}
          totalFiles={currentFilesList.length}
          onNextFile={handleNextFile}
          onPrevFile={handlePrevFile}
        />
      </Box>
    </Box>
  );
};