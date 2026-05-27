import React from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import {
    People as PeopleIcon,
    Security as SecurityIcon,
    Storage as StorageIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';

interface AdminDashboardProps {
    user: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom color="white">
                Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Welcome, {user?.name || 'Admin'}! This is the administrative panel.
            </Typography>

            <Grid container spacing={3}>
                <Grid>
                    <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                        <CardContent>
                            <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                            <Typography variant="h6">Users</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Manage system users
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid>
                    <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                        <CardContent>
                            <SecurityIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                            <Typography variant="h6">Permissions</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Manage roles and permissions
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid>
                    <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                        <CardContent>
                            <StorageIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                            <Typography variant="h6">System Status</Typography>
                            <Typography variant="body2" color="text.secondary">
                                View system metrics
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid>
                    <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                        <CardContent>
                            <WarningIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                            <Typography variant="h6">Audit Logs</Typography>
                            <Typography variant="body2" color="text.secondary">
                                View system logs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};