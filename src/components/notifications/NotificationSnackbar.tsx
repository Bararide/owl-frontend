import React from 'react';
import {
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import { Notification } from '../../types';

interface NotificationSnackbarProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  notifications,
  onClose,
}) => {
  const openNotifications = notifications.filter(n => n.open);

  return (
    <Snackbar
      open={openNotifications.length > 0}
      autoHideDuration={6000}
      onClose={() => openNotifications.forEach(n => onClose(n.id))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ position: 'fixed' }}
    >
      <Box>
        {openNotifications.map((notification) => (
          <Alert 
            key={notification.id}
            severity={notification.severity}
            onClose={() => onClose(notification.id)}
            sx={{ 
              mb: 1, 
              minWidth: 300,
              borderRadius: 2,
              fontSize: '0.875rem'
            }}
          >
            {notification.message}
          </Alert>
        ))}
      </Box>
    </Snackbar>
  );
};