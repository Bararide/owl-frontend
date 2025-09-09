import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { semanticSearch } from '../api/vectorFsApi';
import { SearchResult } from '../types';

interface SemanticSearchProps {
  onFileSelect: (path: string) => void;
}

const SemanticSearch: React.FC<SemanticSearchProps> = ({ onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    console.log('handleSearch called');
    console.log('Query:', query, 'Loading:', loading);
    
    if (!query.trim() || loading) {
      console.log('Search prevented - empty query or loading');
      return;
    }

    setLoading(true);
    console.log('Loading set to true');
    
    try {
      console.log('Calling semanticSearch API...');
      const response = await semanticSearch(query, limit);
      console.log('API Response received:', response);
      
      if (response.status === 'success' && response.data) {
        console.log('Search successful, results:', response.data.results);
        setResults(response.data.results || []);
      } else {
        console.log('Search failed with error:', response.error);
        setResults([]);
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Search error caught:', error);
      setResults([]);
      setHasSearched(true);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    console.log('Key pressed:', event.key);
    if (event.key === 'Enter' && !loading) {
      console.log('Enter key detected, calling handleSearch');
      event.preventDefault();
      handleSearch();
    }
  };

  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    setLimit(event.target.value as number);
  };

  const testButtonClick = () => {
    console.log('Test button clicked - manual search trigger');
    handleSearch();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Semantic Search
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Search Query"
          fullWidth
          value={query}
          onChange={(e) => {
            console.log('Query changed:', e.target.value);
            setQuery(e.target.value);
          }}
          onKeyPress={handleKeyPress}
          disabled={loading}
          placeholder="Enter your semantic search query here..."
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="result-limit-label">Results</InputLabel>
            <Select
              labelId="result-limit-label"
              value={limit}
              label="Results"
              onChange={handleLimitChange}
              disabled={loading}
            >
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              console.log('Search button clicked');
              handleSearch();
            }}
            disabled={loading || !query.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{ ml: 'auto' }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>

          {/* Тестовая кнопка для отладки */}
          <Button
            variant="outlined"
            color="secondary"
            onClick={testButtonClick}
            disabled={loading}
          >
            Test Search
          </Button>
        </Box>
      </Box>

      {hasSearched && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {results.length > 0 ? `Found ${results.length} results` : 'No results found'}
          </Typography>

          {results.length > 0 ? (
            <List>
              {results.map((result, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      borderLeft: '4px solid',
                      borderLeftColor: (theme) => {
                        const scoreColor = result.score > 0.8
                          ? theme.palette.success.main
                          : result.score > 0.5
                            ? theme.palette.warning.main
                            : theme.palette.error.main;
                        return scoreColor;
                      },
                    }}
                  >
                    <ListItemButton
                      onClick={() => {
                        console.log('File selected:', result.path);
                        onFileSelect(result.path);
                      }}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={result.path}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                              Relevance Score:
                            </Typography>
                            <Chip
                              label={`${(result.score * 100).toFixed(1)}%`}
                              size="small"
                              color={
                                result.score > 0.8
                                  ? 'success'
                                  : result.score > 0.5
                                    ? 'warning'
                                    : 'error'
                              }
                            />
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No files found matching your query.
            </Typography>
          )}
        </Box>
      )}

      {/* Отладочная информация */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Debug Info: Query="{query}", Loading={loading.toString()}, Results={results.length}
        </Typography>
      </Box>
    </Paper>
  );
};

export default SemanticSearch;