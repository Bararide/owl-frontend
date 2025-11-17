import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import { apiClient } from '../../api/client';

export const ConnectionTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');

  const testConnection = async () => {
    try {
      console.log('🧪 Testing connection to:', apiClient['client'].defaults.baseURL);
      const result = await apiClient.healthCheck();
      setTestResult(`✅ Success: ${JSON.stringify(result)}`);
      console.log('✅ Health check result:', result);
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
      console.error('❌ Health check failed:', error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Box sx={{ p: 2, mb: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6">Connection Test</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>{testResult}</Typography>
      <Button onClick={testConnection} variant="outlined" sx={{ mt: 1 }}>
        Test Again
      </Button>
    </Box>
  );
};