// src/pages/CreateFilePage.tsx
import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import FileEditor from '../components/FileEditor';
import { useNavigate } from 'react-router-dom';

const CreateFilePage: React.FC = () => {
  const navigate = useNavigate();

  const handleFileSaved = (path: string) => {
    navigate(`/view/${encodeURIComponent(path)}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create New File
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create a new file in the vector file system. The content will be automatically
          vectorized and made available for semantic search.
        </Typography>
      </Box>
      
      <FileEditor onSave={handleFileSaved} />
    </Container>
  );
};

export default CreateFilePage;