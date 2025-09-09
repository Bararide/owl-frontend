// src/components/FileEditor.tsx
import React, { useState, useEffect } from 'react';
import { Paper, TextField, Button, Typography, Box, CircularProgress, Snackbar, Alert } from '@mui/material';
import { createFile, getFile } from '../api/vectorFsApi';

interface FileEditorProps {
  path?: string;
  onSave?: (path: string) => void;
  isReadOnly?: boolean;
}

const FileEditor: React.FC<FileEditorProps> = ({ path = '', onSave, isReadOnly = false }) => {
  const [filePath, setFilePath] = useState(path);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (path && isReadOnly) {
      loadFile();
    }
  }, [path]);

  const loadFile = async () => {
    setLoading(true);
    try {
      const response = await getFile(path);
      if (response.status === 'success' && response.data) {
        setContent(response.data.content);
        setFilePath(response.data.path);
      } else {
        setAlert({ message: response.error || 'Failed to load file', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!filePath.trim()) {
      setAlert({ message: 'File path is required', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await createFile(filePath, content);
      if (response.status === 'success') {
        setAlert({ message: 'File saved successfully', type: 'success' });
        if (onSave) onSave(filePath);
      } else {
        setAlert({ message: response.error || 'Failed to save file', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert(null);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        {isReadOnly ? 'File Viewer' : 'File Editor'}
      </Typography>

      {!isReadOnly && (
        <TextField
          label="File Path"
          fullWidth
          margin="normal"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          disabled={loading || isReadOnly}
          placeholder="example/path/to/file.txt"
          helperText="Enter the path for the file"
        />
      )}

      <TextField
        label="Content"
        fullWidth
        margin="normal"
        multiline
        rows={10}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading || isReadOnly}
        placeholder="Enter file content here..."
      />

      {!isReadOnly && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Save File
          </Button>
        </Box>
      )}

      <Snackbar open={!!alert} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert?.type} sx={{ width: '100%' }}>
          {alert?.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default FileEditor;