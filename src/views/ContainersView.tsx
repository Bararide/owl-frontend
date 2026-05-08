import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Collapse,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as RunningIcon,
  Pause as StoppedIcon,
  Error as ErrorIcon,
  HourglassEmpty as StartingIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

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

type ContainerStatus = 'running' | 'stopped' | 'error' | 'starting';

interface StatusGroup {
  key: ContainerStatus;
  label: string;
  icon: React.ReactNode;
  color: 'success' | 'warning' | 'error' | 'info';
  description: string;
}

const STATUS_GROUPS: StatusGroup[] = [
  {
    key: 'running',
    label: 'Running',
    icon: <RunningIcon fontSize="small" />,
    color: 'success',
    description: 'Активные контейнеры, обрабатывающие запросы',
  },
  {
    key: 'starting',
    label: 'Starting',
    icon: <StartingIcon fontSize="small" />,
    color: 'info',
    description: 'Контейнеры в процессе инициализации',
  },
  {
    key: 'stopped',
    label: 'Stopped',
    icon: <StoppedIcon fontSize="small" />,
    color: 'warning',
    description: 'Остановленные, но готовые к запуску контейнеры',
  },
  {
    key: 'error',
    label: 'Error',
    icon: <ErrorIcon fontSize="small" />,
    color: 'error',
    description: 'Контейнеры с критическими ошибками',
  },
];

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

  const [expandedGroups, setExpandedGroups] = useState<Record<ContainerStatus, boolean>>({
    running: true,
    starting: true,
    stopped: false,
    error: true,
  });

  const toggleGroup = (status: ContainerStatus) => {
    setExpandedGroups(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const groupedContainers = useMemo(() => {
    const groups: Record<ContainerStatus, Container[]> = {
      running: [],
      stopped: [],
      error: [],
      starting: [],
    };
    containers.forEach(container => {
      groups[container.status].push(container);
    });
    return groups;
  }, [containers]);

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

  if (isLoadingContainers) {
    return (
      <Box sx={{ p: 3 }}>
        <LoadingSkeleton type="card" />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight="600">
            Containers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {containers.length} total • {groupedContainers.running.length} active
          </Typography>
        </Box>
        <Button 
          startIcon={<AddIcon />}
          onClick={onCreateContainerOpen}
          variant="contained"
          size="medium"
        >
          New Container
        </Button>
      </Box>

      {STATUS_GROUPS.map(group => {
        const groupContainers = groupedContainers[group.key];
        const isEmpty = groupContainers.length === 0;
        const isExpanded = expandedGroups[group.key];

        if (isEmpty) return null;

        return (
          <Box key={group.key}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                cursor: 'pointer',
              }}
              onClick={() => toggleGroup(group.key)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={group.label}
                  color={group.color}
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {group.description}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  {groupContainers.length}
                </Typography>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>

            <Collapse in={isExpanded}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))', 
                gap: 2,
                mt: 1,
              }}>
                {groupContainers.map(container => (
                  <ContainerCard
                    key={container.id}
                    container={container}
                    onSelect={onContainerSelect}
                    onAction={handleContainerAction}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}

      <CreateContainerDialog
        open={createContainerOpen}
        onClose={onCloseCreateContainer}
        onCreate={handleCreateContainer}
      />
    </Box>
  );
};