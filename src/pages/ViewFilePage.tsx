import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import FileEditor from '../components/FileEditor';
import { useParams, useNavigate } from 'react-router-dom';

const ViewFilePage: React.FC = () => {
  const { path } = useParams<{ path: string }>();
  const navigate = useNavigate();
  
  const decodedPath = path ? decodeURIComponent(path) : '';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">
          View File
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {decodedPath}
        </Typography>
      </Box>
      
      <FileEditor path={decodedPath} isReadOnly={true} />
    </Container>
  );
};

export default ViewFilePage;