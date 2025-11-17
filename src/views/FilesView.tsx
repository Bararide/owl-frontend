import React from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import { FileCopy as FileCopyIcon } from '@mui/icons-material';

import { FilesView as FilesViewComponent } from '../components/files/FilesView';
import { Container } from '../api/client';

interface FilesViewProps {
  selectedContainer: Container | null;
  onBrowseContainers: () => void;
}

export const FilesView: React.FC<FilesViewProps> = ({
  selectedContainer,
  onBrowseContainers,
}) => {
  if (!selectedContainer) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <FileCopyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Container Selected
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please select a container to view its files
        </Typography>
        <Button 
          variant="contained" 
          onClick={onBrowseContainers}
        >
          Browse Containers
        </Button>
      </Box>
    );
  }

  return <FilesViewComponent containerId={selectedContainer.id} />;
};