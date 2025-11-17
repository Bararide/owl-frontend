import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { CreateContainerRequest } from '../../api/client';

interface CreateContainerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateContainerRequest) => void;
}

export const CreateContainerDialog: React.FC<CreateContainerDialogProps> = ({ 
  open, 
  onClose, 
  onCreate 
}) => {
  const [formData, setFormData] = useState<CreateContainerRequest>({
    container_id: '',
    memory_limit: 512,
    storage_quota: 1024,
    file_limit: 10,
    env_label: { key: 'environment', value: 'development' },
    type_label: { key: 'type', value: 'workspace' },
    commands: ['search', 'debug', 'all', 'create'],
    privileged: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    onClose();
    setFormData({
      container_id: '',
      memory_limit: 512,
      storage_quota: 1024,
      file_limit: 10,
      env_label: { key: 'environment', value: 'development' },
      type_label: { key: 'type', value: 'workspace' },
      commands: ['search', 'debug', 'all', 'create'],
      privileged: false
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Container</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            label="Container ID"
            value={formData.container_id}
            onChange={(e) => setFormData(prev => ({ ...prev, container_id: e.target.value }))}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Memory Limit (MB)"
            type="number"
            value={formData.memory_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, memory_limit: parseInt(e.target.value) }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Storage Quota (MB)"
            type="number"
            value={formData.storage_quota}
            onChange={(e) => setFormData(prev => ({ ...prev, storage_quota: parseInt(e.target.value) }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="File Limit"
            type="number"
            value={formData.file_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, file_limit: parseInt(e.target.value) }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Create</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};