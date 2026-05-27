// AdminLogin.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

// Изменяем тип onLogin - теперь он принимает email и password
interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<void>; // или просто void
  isLoading?: boolean;
  error?: string;
}

export interface AdminUserData {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ 
  onLogin, 
  isLoading = false, 
  error 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    if (!email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    // Теперь передаём email и password
    await onLogin(email, password);
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          width: '100%'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            p: 2,
            borderRadius: '50%',
            bgcolor: 'rgba(103, 126, 234, 0.1)'
          }}
        >
          <AdminIcon sx={{ fontSize: 48, color: '#667eea' }} />
        </Box>

        <Typography component="h1" variant="h4" color="text.primary" gutterBottom>
          Admin Portal
        </Typography>

        <Typography variant="body1" color="text.secondary" textAlign="center" mb={3}>
          Enter your administrator credentials to access the dashboard
        </Typography>

        {(error || localError) && (
          <Alert 
            severity="error" 
            sx={{ width: '100%', mb: 2, borderRadius: 2 }}
            onClose={() => setLocalError('')}
          >
            {error || localError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
              },
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
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
              fontSize: '1.1rem',
              borderRadius: 2,
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a67d8 30%, #6b46a0 90%)',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In to Admin Panel'
            )}
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              This area is restricted to authorized administrators only
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};