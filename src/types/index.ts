import { AlertColor } from "@mui/material";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface AppState {
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'status';
  filter: {
    status: string[];
    type: string[];
    environment: string[];
  };
}

export interface Notification {
  id: string;
  open: boolean;
  message: string;
  severity: AlertColor;
  action?: () => void;
}

export const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -20, scale: 1.02 }
};