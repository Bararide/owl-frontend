import React from 'react';
import {
  Box,
  Typography,
  Chip,
  CardContent,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { GradientCard } from '../styled';
import { useContainers } from '../../hooks/useApi';
import { useHealthCheck } from '../../hooks/useApi';
import { Container } from '../../api/client';

export const StatsOverview: React.FC = () => {
  const { data: containers = [] } = useContainers();
  const { data: healthStatus } = useHealthCheck();

  const stats = [
    { 
      label: 'Active Containers', 
      value: containers.filter((c: Container) => c.status === 'running').length.toString(), 
      icon: <SpeedIcon />, 
      color: 'primary', 
    },
    { 
      label: 'Total Storage', 
      value: `${containers.reduce((acc: number, c: Container) => acc + c.storage_quota, 0) / 1024} GB`, 
      icon: <StorageIcon />, 
      color: 'secondary',
    },
    { 
      label: 'Service Status', 
      value: healthStatus?.status === 'online' ? 'Online' : 'Offline', 
      icon: <TrendingUpIcon />, 
      color: healthStatus?.status === 'online' ? 'success' : 'error', 
      change: healthStatus?.status === 'online' ? '+0.1' : '-0.1' 
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
      {stats.map((stat, index) => (
        <Box key={stat.label} sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GradientCard>
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1, fontSize: '0.875rem' }}>
                      {stat.label}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      opacity: 0.7,
                      '& svg': { fontSize: 32 }
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </GradientCard>
          </motion.div>
        </Box>
      ))}
    </Box>
  );
};