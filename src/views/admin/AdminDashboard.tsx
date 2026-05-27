// views/admin/AdminDashboard.tsx
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    Divider,
    IconButton,
    Tooltip,
    Badge,
    Collapse,
    Paper,
    Stack,
    LinearProgress,
    Card,
    CardContent,
    useTheme,
    ListItemButton,
} from '@mui/material';
import {
    People as PeopleIcon,
    Storage as StorageIcon,
    Memory as MemoryIcon,
    Speed as SpeedIcon,
    ExpandLess,
    ExpandMore,
    FolderSpecial as FolderIcon,
    Assignment as AssignmentIcon,
    AdminPanelSettings as AdminIcon,
    Security as SecurityIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

// Используем существующие хуки
import { useContainers, useContainerGroups } from '../../hooks/useApi';
import { ContainerCard } from '../../components/containers/ContainerCard';
import type { User, Container } from '../../api/client';

interface AdminDashboardProps {
    user: User;
}

interface UserWithDetails extends User {
    containers?: Container[];
    groups?: string[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
    const theme = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    // Получаем все контейнеры
    const { data: containers = [], isLoading: containersLoading, refetch: refetchContainers } = useContainers();

    // Группируем контейнеры по пользователям
    const containersByUser = containers.reduce((acc, container) => {
        const userId = container.user_id;
        if (!acc[userId]) {
            acc[userId] = [];
        }
        acc[userId].push(container);
        return acc;
    }, {} as Record<string, Container[]>);

    // Получаем список уникальных пользователей из контейнеров
    const users = Object.keys(containersByUser).map(userId => ({
        id: userId,
        name: userId, // TODO: получить реальное имя пользователя из API
        email: `${userId}@example.com`,
        role: userId === user.id ? user.role : 'user',
        containers: containersByUser[userId] || [],
    }));

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);

    const toggleUserExpand = (userId: string) => {
        setExpandedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleContainerAction = async (action: string, container: Container) => {
        // TODO: реализовать действия с контейнерами
        console.log('Action:', action, container);
    };

    const handleContainerSelect = (container: Container) => {
        // TODO: навигация к файлам контейнера
        console.log('Select container:', container);
    };

    // Статистика
    const totalContainers = containers.length;
    const runningContainers = containers.filter(c => c.status === 'running').length;
    const totalStorage = containers.reduce((sum, c) => sum + c.storage_quota, 0);
    const totalMemory = containers.reduce((sum, c) => sum + c.memory_limit, 0);

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Левая панель - пользователи */}
            <Drawer
                variant="permanent"
                anchor="left"
                open={drawerOpen}
                sx={{
                    width: drawerOpen ? 320 : 60,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerOpen ? 320 : 60,
                        boxSizing: 'border-box',
                        position: 'relative',
                        background: 'rgba(18, 22, 40, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        overflowX: 'hidden',
                    },
                }}
            >
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {drawerOpen && (
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PeopleIcon fontSize="small" />
                            Users
                            <Chip label={users.length} size="small" sx={{ ml: 1 }} />
                        </Typography>
                    )}
                    <IconButton onClick={toggleDrawer} size="small">
                        {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                <List sx={{ flex: 1, overflow: 'auto' }}>
                    {users.map((u) => (
                        <React.Fragment key={u.id}>
                            <ListItemButton
                                selected={selectedUserId === u.id}
                                onClick={() => {
                                    setSelectedUserId(u.id);
                                    toggleUserExpand(u.id);
                                }}
                                sx={{
                                    borderRadius: 1,
                                    mx: 1,
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(103, 126, 234, 0.15)',
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                    },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: u.role === 'admin' || u.role === 'super_admin' ? 'error.main' : 'primary.main' }}>
                                        {u.name?.[0]?.toUpperCase() || 'U'}
                                    </Avatar>
                                </ListItemAvatar>
                                {drawerOpen && (
                                    <>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {u.name}
                                                    </Typography>
                                                    {(u.role === 'admin' || u.role === 'super_admin') && (
                                                        <AdminIcon fontSize="small" sx={{ color: 'warning.main', fontSize: 14 }} />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box component="span">
                                                    <Typography variant="caption" color="text.secondary" component="span">
                                                        {u.email}
                                                    </Typography>
                                                    <Chip
                                                        label={u.role}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                                    />
                                                </Box>
                                            }
                                        />
                                        {expandedUsers.has(u.id) ? <ExpandLess /> : <ExpandMore />}
                                    </>
                                )}
                            </ListItemButton>

                            <Collapse in={expandedUsers.has(u.id) && drawerOpen} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 7, pr: 2, py: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                        Containers: {u.containers?.length || 0}
                                    </Typography>

                                    {u.containers?.map((container) => (
                                        <Paper
                                            key={container.id}
                                            elevation={0}
                                            sx={{
                                                p: 1,
                                                mb: 1,
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: 1,
                                                cursor: 'pointer',
                                                '&:hover': { background: 'rgba(255,255,255,0.06)' },
                                            }}
                                            onClick={() => handleContainerSelect(container)}
                                        >
                                            <Typography variant="caption" fontWeight="600" noWrap>
                                                {container.id}
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                <Chip
                                                    label={container.status}
                                                    size="small"
                                                    color={container.status === 'running' ? 'success' : 'warning'}
                                                    sx={{ height: 18, fontSize: '0.6rem' }}
                                                />
                                                <Chip
                                                    label={container.env_label.value}
                                                    size="small"
                                                    sx={{ height: 18, fontSize: '0.6rem' }}
                                                />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            </Collapse>
                        </React.Fragment>
                    ))}
                </List>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                {drawerOpen && (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Total Users: {users.length}
                        </Typography>
                    </Box>
                )}
            </Drawer>

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
                {/* Статистика */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid>
                        <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Total Containers</Typography>
                                    <StorageIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                                </Box>
                                <Typography variant="h4" sx={{ mt: 1 }}>{totalContainers}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {runningContainers} running
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid>
                        <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Total Storage</Typography>
                                    <MemoryIcon sx={{ color: 'info.main', opacity: 0.7 }} />
                                </Box>
                                <Typography variant="h4">{(totalStorage / 1024).toFixed(1)} GB</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    across all containers
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid>
                        <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Total Memory</Typography>
                                    <SpeedIcon sx={{ color: 'warning.main', opacity: 0.7 }} />
                                </Box>
                                <Typography variant="h4">{(totalMemory / 1024).toFixed(1)} GB</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    allocated total
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid>
                        <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.8)', backdropFilter: 'blur(10px)' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Active Users</Typography>
                                    <PeopleIcon sx={{ color: 'success.main', opacity: 0.7 }} />
                                </Box>
                                <Typography variant="h4">{users.length}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    with containers
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Список контейнеров */}
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    All Containers
                    <Chip label={totalContainers} size="small" sx={{ ml: 2 }} />
                </Typography>

                {containersLoading ? (
                    <LinearProgress />
                ) : (
                    <Grid container spacing={3}>
                        {containers.map((container) => (
                            <Grid key={container.id}>
                                <ContainerCard
                                    container={container}
                                    onSelect={handleContainerSelect}
                                    onAction={handleContainerAction}
                                />
                            </Grid>
                        ))}
                    </Grid>
                )}

                {containers.length === 0 && !containersLoading && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No containers found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Create your first container to get started
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};