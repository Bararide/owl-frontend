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
  Collapse,
  Menu,
  MenuItem,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  SmartToy as SemanticSearchIcon,
  Tune as TuneIcon,
  AutoAwesome as AutoAwesomeIcon,
  InsertDriveFile as FileIcon,
  Settings as SettingsIcon,
  FilterList as FilterListIcon,
  Lightbulb as LightbulbIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
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

export const FilesView: React.FC<FilesViewProps> = ({ containerId }) => {
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(containerId);
  const { addNotification } = useNotifications();
  const semanticSearchMutation = useSemanticSearch();
  
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

  // State for UI
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [rebuildNotification, setRebuildNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

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
      const recommendedFile: ApiFile = {
        path: recommendation.path,
        name: recommendation.name,
        size: 0,
        container_id: containerId,
        user_id: '',
        created_at: new Date().toISOString(),
        mime_type: 'text/plain',
      };

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

  // Auto-show recommendations
  useEffect(() => {
    if (recommendationFiles.length > 0) {
      setShowRecommendations(true);
    }
  }, [recommendationFiles.length]);

  if (!containerId) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        textAlign: 'center'
      }}>
        <DescriptionIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
        <Typography variant="h4" color="text.secondary" gutterBottom sx={{ fontWeight: 300 }}>
          No Container Selected
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
          Please select a container from the sidebar to view and manage its files
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Header */}
      <Box sx={{ 
        mb: 3,
        p: 3,
        background: 'linear-gradient(135deg, rgba(115, 103, 240, 0.05) 0%, rgba(115, 103, 240, 0.02) 100%)',
        borderRadius: 3,
        border: '1px solid rgba(115, 103, 240, 0.1)',
      }}>
        {/* Main Search Bar */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 2,
          position: 'relative'
        }}>
          <Box 
            component="form" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            sx={{ flex: 1, position: 'relative' }}
          >
            <TextField
              fullWidth
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search files by content, name, or path..."
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
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {searchQuery && (
                        <IconButton 
                          size="small" 
                          onClick={handleClearSearch}
                          sx={{ opacity: 0.6 }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Button
                        variant="contained"
                        onClick={handleSearchSubmit}
                        disabled={!searchQuery.trim() || isSearching}
                        size="small"
                        sx={{ 
                          minWidth: '80px',
                          height: 32,
                        }}
                      >
                        {isSearching ? (
                          <CircularProgress size={16} sx={{ color: 'white' }} />
                        ) : (
                          'Search'
                        )}
                      </Button>
                    </Stack>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  '& .MuiOutlinedInput-root': {
                    '&:hover': {
                      boxShadow: '0 4px 20px 0 rgba(115, 103, 240, 0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 20px 0 rgba(115, 103, 240, 0.15)',
                    }
                  }
                }
              }}
            />

            {/* Enhanced Search Suggestions */}
            <Fade in={isSearchFocused && searchQuery.length === 0}>
              <Paper sx={{ 
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                mt: 1,
                p: 2.5,
                borderRadius: 2,
                boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                border: '1px solid rgba(255,255,255,0.08)',
                zIndex: 1000,
                background: 'rgba(26, 31, 54, 0.98)',
                backdropFilter: 'blur(20px)',
              }}>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, fontWeight: 500 }}>
                  🧠 AI-Powered Semantic Search
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Find files by meaning and context, not just keywords
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {SEARCH_SUGGESTIONS.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleSemanticSearch(suggestion);
                      }}
                      sx={{ 
                        fontSize: '0.75rem',
                        '&:hover': {
                          backgroundColor: 'rgba(115, 103, 240, 0.1)',
                          borderColor: 'primary.main'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Fade>
          </Box>

          {/* Tools Menu */}
          <Button
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={(e) => setToolsMenuAnchor(e.currentTarget)}
            sx={{
              borderRadius: 2,
              px: 3,
              '&:hover': {
                backgroundColor: 'rgba(115, 103, 240, 0.1)',
                borderColor: 'primary.main'
              }
            }}
          >
            Tools
          </Button>
        </Box>

        {/* Status Bar */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            {isSemanticSearch && (
              <Chip 
                icon={<SemanticSearchIcon />}
                label="Semantic Search Active" 
                size="small" 
                color="primary" 
                variant="filled"
                sx={{ fontWeight: 500 }}
              />
            )}
            <Typography variant="body2" color="text.secondary">
              {isSemanticSearch 
                ? `${searchResults.length} relevant files found`
                : `${currentFilesList.length} files • ${files.length} total`
              }
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {recommendationFiles.length > 0 && (
              <Button
                variant="text"
                size="small"
                startIcon={
                  <Badge badgeContent={recommendationFiles.length} color="primary">
                    <AutoAwesomeIcon />
                  </Badge>
                }
                onClick={() => setShowRecommendations(!showRecommendations)}
                sx={{ opacity: 0.8 }}
              >
                AI Recommendations
              </Button>
            )}
            <Chip
              icon={<FileIcon />}
              label={`${files.length} indexed`}
              size="small"
              variant="outlined"
              sx={{ opacity: 0.7 }}
            />
          </Stack>
        </Stack>
      </Box>

      {/* AI Recommendations Panel */}
      <Collapse in={showRecommendations && recommendationFiles.length > 0}>
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AutoAwesomeIcon sx={{ color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Recommendations
                </Typography>
                <Chip
                  size="small"
                  label={`${recommendationFiles.length} files`}
                  sx={{ backgroundColor: 'warning.main', color: 'black', fontWeight: 500 }}
                />
              </Stack>
              <IconButton 
                size="small" 
                onClick={() => setShowRecommendations(false)}
                sx={{ opacity: 0.7 }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {recommendationFiles.slice(0, 6).map((rec, index) => (
                <Chip
                  key={`${rec.path}-${index}`}
                  label={rec.name}
                  clickable
                  onClick={() => handleRecommendationClick(rec)}
                  variant="outlined"
                  sx={{
                    borderColor: 'warning.main',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    }
                  }}
                />
              ))}
              {recommendationFiles.length > 6 && (
                <Chip
                  label={`+${recommendationFiles.length - 6} more`}
                  variant="outlined"
                  sx={{ opacity: 0.7 }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoadingFiles ? (
          <LoadingSkeleton type="card" />
        ) : currentFilesList.length === 0 ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            textAlign: 'center'
          }}>
            <DescriptionIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 300 }}>
              {searchQuery ? 'No Files Found' : 'No Files Available'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
              {searchQuery 
                ? `No files match your ${isSemanticSearch ? 'semantic' : ''} search for "${searchQuery}"`
                : 'This container doesn\'t have any files yet. Try rebuilding the index or uploading files.'
              }
            </Typography>
            <Stack direction="row" spacing={2}>
              {searchQuery ? (
                <Button 
                  variant="outlined" 
                  onClick={handleClearSearch}
                  startIcon={<CloseIcon />}
                >
                  Clear Search
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  onClick={handleRefreshFiles}
                  startIcon={<RefreshIcon />}
                  disabled={isRebuildingIndex}
                >
                  {isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 3,
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

      {/* Tools Menu */}
      <Menu
        anchorEl={toolsMenuAnchor}
        open={Boolean(toolsMenuAnchor)}
        onClose={() => setToolsMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <MenuItem onClick={() => {
          setToolsMenuAnchor(null);
          handleRefreshFiles();
        }} disabled={isRebuildingIndex}>
          <RefreshIcon sx={{ mr: 1, fontSize: 20 }} />
          {isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => {
          setToolsMenuAnchor(null);
          setShowRecommendations(true);
        }} disabled={recommendationFiles.length === 0}>
          <AutoAwesomeIcon sx={{ mr: 1, fontSize: 20 }} />
          Show Recommendations
        </MenuItem>
      </Menu>

      {/* File Content Dialog */}
      <FileContentDialog
        open={fileContentDialog.open}
        onClose={handleCloseFileContent}
        file={fileContentDialog.file}
        containerId={containerId}
        onFileUpdated={refetchFiles}
        onFileDeleted={refetchFiles}
        searchQuery={searchQuery}
        currentFileIndex={fileContentDialog.currentIndex}
        totalFiles={currentFilesList.length}
        onNextFile={handleNextFile}
        onPrevFile={handlePrevFile}
      />

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
    </Box>
  );
};