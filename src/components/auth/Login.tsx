import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import { VpnKey as KeyIcon } from '@mui/icons-material';

interface LoginProps {
  onLogin: (token: string) => void;
  isLoading?: boolean;
  error?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading = false, error }) => {
  const [token, setToken] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!token.trim()) {
      setLocalError('Please enter your access token');
      return;
    }

    if (token.length < 10) {
      setLocalError('Token seems too short. Please check your token.');
      return;
    }

    onLogin(token.trim());
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          width: '100%'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3
          }}
        >
          <KeyIcon sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
          <Typography component="h1" variant="h4" color="white">
            Secure Access
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" textAlign="center" mb={3}>
          Enter your secure access token to continue to the application
        </Typography>

        {(error || localError) && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error || localError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Access Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isLoading}
            placeholder="Paste your secure token here..."
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Access Application'
            )}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Your token should be provided by your administrator
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};