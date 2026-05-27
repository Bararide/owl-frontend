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
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
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
  const navigate = useNavigate();

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
            mb: 3,
            width: '100%',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <IconButton
            onClick={() => navigate('/login')}
            sx={{
              position: 'absolute',
              left: 0,
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: 'white'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <AdminIcon sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
          <Typography component="h1" variant="h4" color="white">
            Admin Access
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" textAlign="center" mb={3}>
          Enter your administrator credentials
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
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
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
                    sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
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
              'Sign In as Admin'
            )}
          </Button>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              This area is restricted to authorized administrators only
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};