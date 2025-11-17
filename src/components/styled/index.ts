import { motion } from 'framer-motion';
import { styled, alpha } from '@mui/material/styles';
import { Card, Fab, Chip, Box } from '@mui/material';
import { theme } from '../../theme/theme';

export const GlassCard = styled(motion(Card))(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.background.paper, 0.95)} 0%, 
    ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
  backdropFilter: 'blur(16px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  boxShadow: `
    0 4px 24px 0 ${alpha(theme.palette.common.black, 0.15)},
    inset 0 1px 0 0 ${alpha(theme.palette.common.white, 0.05)}
  `,
}));

export const GradientCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)',
  },
}));

export const FloatingActionButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  right: 24,
  bottom: 24,
  borderRadius: 12,
  width: 56,
  height: 56,
  zIndex: 1000,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  boxShadow: '0 4px 20px -4px rgba(115, 103, 240, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 8px 24px -4px rgba(115, 103, 240, 0.5)',
  },
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
}));

export const StatusIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: string }>(({ theme, status }) => {
  const colors: Record<string, string> = {
    running: theme.palette.success.main,
    stopped: theme.palette.error.main,
    error: theme.palette.error.dark,
    starting: theme.palette.warning.main,
  };

  return {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: colors[status] || theme.palette.grey[500],
    boxShadow: `0 0 6px ${colors[status] || theme.palette.grey[500]}`,
    animation: status === 'running' ? 'pulse 2s infinite' : 'none',
  };
});

export const AnimatedChip = styled(motion(Chip))(({ theme }) => ({
  transition: 'all 0.2s ease',
  cursor: 'pointer',
}));