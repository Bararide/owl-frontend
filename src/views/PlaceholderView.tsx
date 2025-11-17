import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

interface PlaceholderViewProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      {icon}
      <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
};