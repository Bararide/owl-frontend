import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Alert,
  Button 
} from '@mui/material';
import {
  Create as CreateIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { Container } from '../api/client';
import { CreateTxtFileView } from './CreateFileView'; // ИМПОРТИРОВАТЬ

interface CreateTxtMainViewProps {
  selectedContainer: Container | null;
}

export const CreateTxtMainView: React.FC<CreateTxtMainViewProps> = ({
  selectedContainer,
}) => {
  const [createTxtDialogOpen, setCreateTxtDialogOpen] = useState(false); // ДОБАВИТЬ состояние

  const handleCreateTxtClick = () => {
    setCreateTxtDialogOpen(true);
  };

  const handleFileCreated = () => {
    console.log('File created!');
  };

  if (!selectedContainer) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          Please select a container first to create text files
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>

      <Paper 
        sx={{ 
          p: 4, 
          background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.8) 0%, rgba(26, 31, 54, 0.6) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Text File Editor
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create and edit plain text files for your container. You can:
        </Typography>
        
        <Box component="ul" sx={{ pl: 2, mb: 3 }}>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            Create configuration files
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            Write documentation
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            Store notes and logs
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" paragraph>
            Create scripts and code files
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          Current container: <strong>{selectedContainer.id}</strong>
        </Alert>
      </Paper>

      <CreateTxtFileView
        open={createTxtDialogOpen}
        onClose={() => setCreateTxtDialogOpen(false)}
        selectedContainer={selectedContainer}
        onFileCreated={handleFileCreated}
      />
    </Box>
  );
};