import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { Add as AddIcon } from '@mui/icons-material';

import { useAppState } from '../hooks/useAppState';
import { useNotifications } from '../hooks/useNotifications';
import { useContainers, useCreateContainer, useDeleteContainer, useRestartContainer, useSemanticSearch } from '../hooks/useApi';

import { StatsOverview } from '../components/dashboard/StatsOverview';
import { EnhancedSearch } from '../components/search/EnhancedSearch';
import { QuickActions } from '../components/dashboard/QuickActions';
import { ContainerCard } from '../components/containers/ContainerCard';
import { CreateContainerDialog } from '../components/dialogs/CreateContainerDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ConnectionTest } from '../components/common/ConnectionTest';

import { Container, CreateContainerRequest, User } from '../api/client';

interface DashboardProps {
  onContainerSelect: (container: Container) => void;
  onTabChange: (tab: number) => void;
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onContainerSelect,
  onTabChange,
  user,
}) => {
  const [createContainerOpen, setCreateContainerOpen] = useState(false);

  const { state: appState, updateState } = useAppState();
  const { addNotification } = useNotifications();

  const { data: containers = [], isLoading: isLoadingContainers, refetch: refetchContainers } = useContainers();
  const createContainerMutation = useCreateContainer();
  const deleteContainerMutation = useDeleteContainer();
  const restartContainerMutation = useRestartContainer();
  const semanticSearchMutation = useSemanticSearch();

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

  const handleSearch = useCallback((query: string) => {
    if (containers.length > 0) {
      semanticSearchMutation.mutate({
        query,
        container_id: containers[0].id,
        limit: 10
      }, {
        onSuccess: (data) => {
          addNotification({
            message: `Found ${data.results?.length || 0} results for: ${query}`,
            severity: 'info',
            open: true,
          });
        },
        onError: (error) => {
          addNotification({
            message: `Search failed: ${error.message}`,
            severity: 'error',
            open: true,
          });
        },
      });
    } else {
      addNotification({
        message: `Searching for: ${query}`,
        severity: 'info',
        open: true,
      });
    }
  }, [addNotification, semanticSearchMutation, containers]);

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

  const handleContainerSelect = useCallback((container: Container) => {
    onContainerSelect(container);
    onTabChange(2);
  }, [onContainerSelect, onTabChange]);

  const handleUploadFiles = useCallback(() => {
    addNotification({
      message: 'Upload files functionality',
      severity: 'info',
      open: true,
    });
  }, [addNotification]);

  const handleShowAnalytics = useCallback(() => {
    onTabChange(3);
  }, [onTabChange]);

  const handleSecurityScan = useCallback(() => {
    addNotification({
      message: 'Security scan initiated',
      severity: 'info',
      open: true,
    });
    onTabChange(5);
  }, [addNotification, onTabChange]);

  return (
    <Box>
      <ConnectionTest />
      <StatsOverview />
      
      <QuickActions
        onCreateContainer={() => setCreateContainerOpen(true)}
        onUploadFiles={handleUploadFiles}
        onShowAnalytics={handleShowAnalytics}
        onSecurityScan={handleSecurityScan}
      />

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h5" sx={{ fontSize: '1.5rem' }}>
            Recent Containers
          </Typography>
          <Button 
            startIcon={<AddIcon />}
            onClick={() => setCreateContainerOpen(true)}
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
            {containers.slice(0, 6).map((container: Container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onSelect={handleContainerSelect}
                onAction={handleContainerAction}
              />
            ))}
          </Box>
        )}
      </Box>

      <CreateContainerDialog
        open={createContainerOpen}
        onClose={() => setCreateContainerOpen(false)}
        onCreate={handleCreateContainer}
      />
    </Box>
  );
};