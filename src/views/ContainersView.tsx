import React, { useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

import { useContainers, useCreateContainer, useDeleteContainer, useRestartContainer } from '../hooks/useApi';
import { useNotifications } from '../hooks/useNotifications';

import { ContainerCard } from '../components/containers/ContainerCard';
import { CreateContainerDialog } from '../components/dialogs/CreateContainerDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

import { Container, CreateContainerRequest } from '../api/client';

interface ContainersViewProps {
  onContainerSelect: (container: Container) => void;
  onCreateContainerOpen: () => void;
  createContainerOpen: boolean;
  onCloseCreateContainer: () => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  onContainerSelect,
  onCreateContainerOpen,
  createContainerOpen,
  onCloseCreateContainer,
}) => {
  const { data: containers = [], isLoading: isLoadingContainers, refetch: refetchContainers } = useContainers();
  const { addNotification } = useNotifications();
  const createContainerMutation = useCreateContainer();
  const deleteContainerMutation = useDeleteContainer();
  const restartContainerMutation = useRestartContainer();

  const handleContainerAction = useCallback((action: string, container: Container) => {
    switch (action) {
      case 'restart':
        restartContainerMutation.mutate(container.id, {
          onSuccess: () => {
            addNotification({
              message: `Container ${container.id} restart initiated`,
              severity: 'info',
              open: true,
            });
            refetchContainers();
          },
          onError: (error) => {
            addNotification({
              message: `Failed to restart container: ${error.message}`,
              severity: 'error',
              open: true,
            });
          },
        });
        break;
      case 'stop':
        addNotification({
          message: `Stop action performed on ${container.id}`,
          severity: 'info',
          open: true,
        });
        break;
      case 'delete':
        deleteContainerMutation.mutate(container.id, {
          onSuccess: () => {
            addNotification({
              message: `Container ${container.id} deleted`,
              severity: 'success',
              open: true,
            });
          },
          onError: (error) => {
            addNotification({
              message: `Failed to delete container: ${error.message}`,
              severity: 'error',
              open: true,
            });
          },
        });
        break;
      default:
        addNotification({
          message: `${action} action performed on ${container.id}`,
          severity: 'info',
          open: true,
        });
    }
  }, [addNotification, restartContainerMutation, deleteContainerMutation, refetchContainers]);

  const handleCreateContainer = useCallback((data: CreateContainerRequest) => {
    createContainerMutation.mutate(data, {
      onSuccess: (container) => {
        addNotification({
          message: `Container ${container.id} created successfully`,
          severity: 'success',
          open: true,
        });
      },
      onError: (error) => {
        addNotification({
          message: `Failed to create container: ${error.message}`,
          severity: 'error',
          open: true,
        });
      },
    });
  }, [addNotification, createContainerMutation]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>
          All Containers
        </Typography>
        <Button 
          startIcon={<AddIcon />}
          onClick={onCreateContainerOpen}
          variant="contained"
          size="medium"
        >
          New Container
        </Button>
      </Box>

      {isLoadingContainers ? (
        <LoadingSkeleton type="card" />
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {containers.map((container: Container) => (
            <ContainerCard
              key={container.id}
              container={container}
              onSelect={onContainerSelect}
              onAction={handleContainerAction}
            />
          ))}
        </Box>
      )}

      <CreateContainerDialog
        open={createContainerOpen}
        onClose={onCloseCreateContainer}
        onCreate={handleCreateContainer}
      />
    </Box>
  );
};