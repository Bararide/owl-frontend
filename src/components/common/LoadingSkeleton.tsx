import React from 'react';
import { Box, Card, Skeleton } from '@mui/material';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'table';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'card' }) => {
  if (type === 'card') {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {[...Array(6)].map((_, index) => (
          <Box key={index} sx={{ width: 'calc(33.333% - 16px)', minWidth: 280 }}>
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Box sx={{ ml: 2, flexGrow: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              </Box>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1, mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={50} height={20} />
                <Skeleton variant="rounded" width={50} height={20} />
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    );
  }

  return <Skeleton variant="rectangular" width="100%" height={200} />;
};