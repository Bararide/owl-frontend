import React from 'react';
import {
  Box,
  Typography,
  Card,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  color: 'primary' | 'secondary' | 'warning' | 'error';
  onClick: () => void;
}

interface QuickActionsProps {
  onCreateContainer: () => void;
  onUploadFiles: () => void;
  onShowAnalytics: () => void;
  onSecurityScan: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateContainer,
  onUploadFiles,
  onShowAnalytics,
  onSecurityScan,
}) => {
  const quickActions: QuickAction[] = [
    { 
      icon: <AddIcon />, 
      label: 'New Container', 
      color: 'primary',
      onClick: onCreateContainer
    },
    { 
      icon: <CloudUploadIcon />, 
      label: 'Upload Files', 
      color: 'secondary',
      onClick: onUploadFiles
    },
    { 
      icon: <SpeedIcon />, 
      label: 'Performance', 
      color: 'warning',
      onClick: onShowAnalytics
    },
    { 
      icon: <SecurityIcon />, 
      label: 'Security Scan', 
      color: 'error',
      onClick: onSecurityScan
    },
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2.5, fontSize: '1.5rem' }}>
        Quick Actions
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {quickActions.map((action, index) => (
          <Box key={action.label} sx={{ flex: '1 1 140px', minWidth: 140 }}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card 
                onClick={action.onClick}
                sx={{ 
                  textAlign: 'center', 
                  p: 2.5, 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: `${action.color}.main`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 1.5,
                    color: 'white',
                    '& svg': { fontSize: 24 }
                  }}
                >
                  {action.icon}
                </Box>
                <Typography variant="body2" fontWeight="600">
                  {action.label}
                </Typography>
              </Card>
            </motion.div>
          </Box>
        ))}
      </Box>
    </Box>
  );
};