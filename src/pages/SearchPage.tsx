import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import SemanticSearch from '../components/SemanticSearch';
import FileEditor from '../components/FileEditor';
import { useNavigate } from 'react-router-dom';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
    // Alternatively, navigate to the view page
    // navigate(`/view/${encodeURIComponent(path)}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Semantic Search
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search for files based on semantic meaning, not just keywords. The search uses vector similarity
          to find the most relevant files.
        </Typography>
      </Box>
      
      <SemanticSearch onFileSelect={handleFileSelect} />
      
      {selectedFilePath && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h5" gutterBottom>
            Selected File: {selectedFilePath}
          </Typography>
          <FileEditor path={selectedFilePath} isReadOnly={true} />
        </>
      )}
    </Container>
  );
};

export default SearchPage;