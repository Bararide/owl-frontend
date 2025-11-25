import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { EnhancedSearch } from '../components/search/EnhancedSearch';
import { Container } from '../api/client';
import { useFiles } from '../hooks/useApi';

interface SearchViewProps {
  selectedContainer: Container | null;
  onContainerSelect: (container: Container) => void;
}

interface SearchResult {
  id: string;
  type: 'file' | 'container' | 'log';
  name: string;
  path: string;
  containerId?: string;
  containerName?: string;
  size?: number;
  modified?: string;
  matches: number;
  preview?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({
  selectedContainer,
  onContainerSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { data: files = [] } = useFiles(selectedContainer?.id);

  const mockSearchResults: SearchResult[] = useMemo(() => [
    {
      id: '1',
      type: 'file',
      name: 'config.yaml',
      path: '/app/config.yaml',
      containerId: selectedContainer?.id,
      containerName: selectedContainer?.id?.substring(0, 12),
      size: 2048,
      modified: '2024-01-15T10:30:00Z',
      matches: 3,
      preview: 'server:\n  port: 8080\ndatabase:\n  url: postgresql://localhost:5432/app'
    },
    {
      id: '2',
      type: 'file',
      name: 'main.py',
      path: '/app/src/main.py',
      containerId: selectedContainer?.id,
      containerName: selectedContainer?.id?.substring(0, 12),
      size: 5120,
      modified: '2024-01-15T09:15:00Z',
      matches: 5,
      preview: 'def main():\n    print("Hello World")\n    # Configuration settings\n    debug = True'
    },
    {
      id: '3',
      type: 'log',
      name: 'app.log',
      path: '/var/log/app.log',
      containerId: selectedContainer?.id,
      containerName: selectedContainer?.id?.substring(0, 12),
      size: 10240,
      modified: '2024-01-15T11:45:00Z',
      matches: 12,
      preview: 'ERROR [2024-01-15 11:45:23] Configuration error: missing database url\nINFO [2024-01-15 11:45:24] Server started on port 8080'
    }
  ], [selectedContainer?.id]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterToggle = (filter: string) => {
    setActiveFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'py':
      case 'js':
      case 'ts':
      case 'java':
        return <CodeIcon />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <ImageIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'file': return 'primary';
      case 'container': return 'secondary';
      case 'log': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SearchIcon 
            sx={{ 
              fontSize: 64, 
              color: 'primary.main',
              mb: 2,
              opacity: 0.8
            }} 
          />
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00CFE8 0%, #7367F0 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 2
            }}
          >
            Advanced Search
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
          >
            Search across all containers, files, and logs with powerful filtering options
          </Typography>
        </motion.div>
      </Box>

      <EnhancedSearch onSearch={handleSearch} />

      {/* Filters */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          <FilterIcon sx={{ mr: 1, fontSize: 18 }} />
          Filters:
        </Typography>
        {['Files', 'Containers', 'Logs', 'Configs', 'Code'].map(filter => (
          <Chip
            key={filter}
            label={filter}
            size="small"
            clickable
            color={activeFilters.includes(filter) ? 'primary' : 'default'}
            variant={activeFilters.includes(filter) ? 'filled' : 'outlined'}
            onClick={() => handleFilterToggle(filter)}
          />
        ))}
      </Box>

      {/* Search Results */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Search Results {searchQuery && `for "${searchQuery}"`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mockSearchResults.length} results found
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {mockSearchResults.map((result, index) => (
            <Grid key={result.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => selectedContainer && onContainerSelect(selectedContainer)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getFileIcon(result.name)}
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6" noWrap>
                            {result.name}
                          </Typography>
                          <Chip
                            label={result.type}
                            size="small"
                            color={getTypeColor(result.type) as any}
                            variant="outlined"
                          />
                          {result.matches > 0 && (
                            <Chip
                              label={`${result.matches} matches`}
                              size="small"
                              color="success"
                              variant="filled"
                            />
                          )}
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ mb: 1, fontFamily: 'Monospace', fontSize: '0.8rem' }}
                        >
                          {result.path}
                        </Typography>
                        
                        {result.preview && (
                          <>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'Monospace',
                                fontSize: '0.75rem',
                                backgroundColor: 'action.hover',
                                p: 1.5,
                                borderRadius: 1,
                                maxHeight: 80,
                                overflow: 'hidden'
                              }}
                            >
                              {result.preview}
                            </Typography>
                          </>
                        )}
                        
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Size: {(result.size! / 1024).toFixed(1)} KB
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Modified: {new Date(result.modified!).toLocaleDateString()}
                          </Typography>
                          {result.containerName && (
                            <Typography variant="caption" color="primary">
                              Container: {result.containerName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {mockSearchResults.length === 0 && searchQuery && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No results found for "{searchQuery}"
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search terms or filters
            </Typography>
          </Box>
        )}
      </motion.div>
    </Box>
  );
};