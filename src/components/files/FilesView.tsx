import React, { useState, useCallback, useRef } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  SmartToy as SemanticSearchIcon,
} from '@mui/icons-material';
import { useFiles, useSemanticSearch } from '../../hooks/useApi';
import { useNotifications } from '../../hooks/useNotifications';
import { FileCard } from './FileCard';
import { FileContentDialog } from './FileContentDialog';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ApiFile, SearchResult } from '../../api/client';
import { apiClient } from '../../api/client';

interface FilesViewProps {
  containerId: string;
}

interface SearchResultFile extends ApiFile {
  score?: number;
  content_preview?: string;
}

export const FilesView: React.FC<FilesViewProps> = ({ containerId }) => {
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(containerId);
  const { addNotification } = useNotifications();
  const semanticSearchMutation = useSemanticSearch();
  
  const [fileContentDialog, setFileContentDialog] = useState<{
    open: boolean;
    file: ApiFile | null;
  }>({
    open: false,
    file: null,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.mime_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      const resultFiles: SearchResultFile[] = result.results.map(searchResult => {
        const originalFile = files.find(f => f.name === searchResult.file_id || f.path === searchResult.path);
        return {
          ...(originalFile || {
            path: searchResult.path,
            name: searchResult.file_id,
            size: 0,
            container_id: containerId,
            user_id: '',
            created_at: '',
            mime_type: 'text/plain'
          }),
          score: searchResult.score,
          content_preview: searchResult.content_preview
        };
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
  }, [containerId, files, semanticSearchMutation, addNotification]);

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
        setFileContentDialog({ open: true, file });
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
  }, [addNotification, refetchFiles, handleDownloadFile]);

  const handleViewContent = useCallback((file: ApiFile) => {
    setFileContentDialog({ 
      open: true, 
      file: file
    });
  }, []);

  const handleFileSelect = useCallback((file: ApiFile) => {
    addNotification({
      message: `Selected file: ${file.name || file.path}`,
      severity: 'success',
      open: true,
    });
  }, [addNotification]);

  const handleCloseFileContent = useCallback(() => {
    setFileContentDialog({ open: false, file: null });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSemanticSearch(false);
    setSearchResults([]);
  }, []);

  const displayFiles = isSemanticSearch ? searchResults : (searchQuery ? filteredFiles : files);

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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box 
          component="form" 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit();
          }}
          sx={{ 
            position: 'relative',
            maxWidth: 600,
            mb: 2,
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
                {['authentication', 'database', 'error handling', 'API endpoints', 'configuration'].map((filter) => (
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
        <Button 
          startIcon={<RefreshIcon />}
          onClick={() => refetchFiles()}
          variant="outlined"
          size="medium"
        >
          Refresh
        </Button>
      </Box>

      {searchQuery && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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

      {isLoadingFiles ? (
        <LoadingSkeleton type="card" />
      ) : displayFiles.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No Files Found' : 'No Files Found'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery 
              ? `No files match your ${isSemanticSearch ? 'semantic' : ''} search for "${searchQuery}"`
              : 'This container doesn\'t have any files yet'
            }
          </Typography>
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
          {displayFiles.map((file: SearchResultFile) => (
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

      <FileContentDialog
        open={fileContentDialog.open}
        onClose={handleCloseFileContent}
        file={fileContentDialog.file}
        containerId={containerId}
      />
    </Box>
  );
};