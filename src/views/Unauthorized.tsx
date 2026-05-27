import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Security as SecurityIcon } from '@mui/icons-material';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F1424 0%, #13182B 100%)',
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 6,
          textAlign: 'center',
          background: 'rgba(18, 22, 40, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          maxWidth: 500,
        }}
      >
        <SecurityIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom color="white">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          You don't have permission to access this page. This area is restricted to administrators only.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/dashboard')}
          sx={{
            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          }}
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};