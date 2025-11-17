import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Chip,
  Fade,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface EnhancedSearchProps {
  onSearch: (query: string) => void;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          position: 'relative',
          maxWidth: 600,
          mx: 'auto',
          mb: 4
        }}
      >
        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search containers, files, or commands..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon 
                  sx={{ 
                    color: isFocused ? 'primary.main' : 'text.secondary',
                    transition: 'color 0.2s ease'
                  }} 
                />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setQuery('')}
                  sx={{ opacity: 0.6 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 3,
              backgroundColor: 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.15)',
              },
              ...(isFocused && {
                boxShadow: '0 2px 16px 0 rgba(115, 103, 240, 0.15)',
                borderColor: 'primary.main',
              })
            }
          }}
        />
        
        <Fade in={isFocused}>
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
              Quick Search
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {['running containers', 'recent files', 'error logs', 'config files'].map((filter) => (
                <Chip
                  key={filter}
                  label={filter}
                  size="small"
                  clickable
                  onClick={() => setQuery(filter)}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 24 }}
                />
              ))}
            </Box>
          </Box>
        </Fade>
      </Box>
    </motion.div>
  );
};