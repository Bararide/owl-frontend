import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Drawer,
    List,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Chip,
    Divider,
    IconButton,
    Collapse,
    Paper,
    LinearProgress,
    Card,
    CardContent,
    useTheme,
    ListItemButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Tooltip,
    CircularProgress,
    Alert,
    Stack,
    useMediaQuery,
    TextField,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import {
    People as PeopleIcon,
    Storage as StorageIcon,
    Memory as MemoryIcon,
    Speed as SpeedIcon,
    ExpandLess,
    ExpandMore,
    AdminPanelSettings as AdminIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Close as CloseIcon,
    Folder as FolderIcon,
    Group as GroupIcon,
    Timeline as TimelineIcon,
    Computer as CpuIcon,
    GraphicEq as GpuIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon,
    Search as SearchIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

import { useAllContainersForAdmin, useAllUsers, useFiles } from '../../hooks/useApi';
import { ContainerCard } from '../../components/containers/ContainerCard';
import { apiClient } from '../../api/client';
import type { User, Container, Group, GroupStats, ApiFile } from '../../api/client';
import { AdminFileViewer } from '../../components/files/AdminFileViewer';

interface AdminDashboardProps {
    user: User;
}

interface MetricDataPoint {
    time: string;
    cpu: number;
    memory: number;
    storage: number;
    gpu: number;
}

interface ContainerDetails {
    stats: {
        cpu_usage: number;
        memory_usage: number;
        storage_used: number;
        gpu_usage?: number;
    } | null;
    groups: Group[];
    groupStats: Record<string, GroupStats>;
    fileGroups: Record<string, string[]>;
    history: MetricDataPoint[];
}

interface EnrichedUser {
    id: string;
    name: string;
    email: string;
    role: string;
    tg_id?: string | number;
    is_active: boolean;
    containers: Container[];
    totalStorage: number;
    totalMemory: number;
    runningContainers: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [drawerOpen, setDrawerOpen] = useState(!isMobile);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
    const [containerDetails, setContainerDetails] = useState<ContainerDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [selectedFileGroup, setSelectedFileGroup] = useState<string>('all');
    const [fileContent, setFileContent] = useState<string>('');
    const [viewingFile, setViewingFile] = useState<ApiFile | null>(null);
    const [fileViewerOpen, setFileViewerOpen] = useState(false);

    const { data: containers = [], isLoading: containersLoading, refetch: refetchContainers } = useAllContainersForAdmin();
    const { data: usersList = [], isLoading: usersLoading } = useAllUsers();
    const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useFiles(selectedContainer?.id);

    const users = useMemo((): EnrichedUser[] => {
        return usersList.map(u => {
            const userIdForMatch = u.tg_id != null ? String(u.tg_id) : u.id;
            const userContainers = containers.filter(c => String(c.user_id) === userIdForMatch);

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                tg_id: u.tg_id,
                is_active: (u as any).is_active ?? true,
                containers: userContainers,
                totalStorage: userContainers.reduce((sum, c) => sum + (c.storage_quota || 0), 0),
                totalMemory: userContainers.reduce((sum, c) => sum + (c.memory_limit || 0), 0),
                runningContainers: userContainers.filter(c => c.status === 'running').length,
            };
        });
    }, [usersList, containers]);

    useEffect(() => {
        if (users.length > 0 && containers.length > 0) {
            const usersWithContainers = new Set<string>();
            users.forEach(u => {
                const userIdForMatch = u.tg_id != null ? String(u.tg_id) : u.id;
                const hasContainers = containers.some(c => String(c.user_id) === userIdForMatch);
                if (hasContainers) {
                    usersWithContainers.add(u.id);
                }
            });
            if (usersWithContainers.size > 0) {
                setExpandedUsers(usersWithContainers);
            }
        }
    }, [users, containers]);

    const loadContainerDetails = useCallback(async (container: Container) => {
        setDetailsLoading(true);
        setDetailsError(null);

        try {
            const [stats, groups] = await Promise.allSettled([
                apiClient.getContainerStats(container.id),
                apiClient.getContainerGroups(container.id),
            ]);

            const statsData = stats.status === 'fulfilled' ? stats.value : null;
            const groupsData = groups.status === 'fulfilled' ? groups.value : [];

            const groupStatsMap: Record<string, GroupStats> = {};
            const fileGroupsMap: Record<string, string[]> = {};

            for (const group of groupsData) {
                try {
                    const groupStats = await apiClient.getGroupStats(group.id);
                    groupStatsMap[group.id] = groupStats;
                    const groupFiles = await apiClient.getGroupFiles(group.id);
                    for (const file of groupFiles) {
                        if (!fileGroupsMap[file.name]) fileGroupsMap[file.name] = [];
                        fileGroupsMap[file.name].push(group.id);
                    }
                } catch (e) {
                    console.warn(`Failed to load stats for group ${group.id}`, e);
                }
            }

            const history: MetricDataPoint[] = [];
            const now = new Date();
            for (let i = 10; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60000);
                history.push({
                    time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    cpu: statsData?.cpu_usage ? Math.max(0, statsData.cpu_usage + (Math.random() - 0.5) * 10) : Math.random() * 30,
                    memory: statsData?.memory_usage ? Math.max(0, statsData.memory_usage + (Math.random() - 0.5) * 5) : Math.random() * 40,
                    storage: statsData?.storage_used || 0,
                    gpu: statsData?.gpu_usage ?? Math.random() * 20,
                });
            }

            setContainerDetails({
                stats: statsData,
                groups: groupsData,
                groupStats: groupStatsMap,
                fileGroups: fileGroupsMap,
                history,
            });
        } catch (error) {
            setDetailsError('Не удалось загрузить данные контейнера');
            console.error('Error loading container details:', error);
        } finally {
            setDetailsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!autoRefresh || !selectedContainer) return;
        const interval = setInterval(() => {
            if (selectedContainer) loadContainerDetails(selectedContainer);
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedContainer, loadContainerDetails]);

    const toggleDrawer = () => setDrawerOpen(!drawerOpen);

    const toggleUserExpand = (userId: string) => {
        setExpandedUsers(prev => {
            const newSet = new Set(prev);
            newSet.has(userId) ? newSet.delete(userId) : newSet.add(userId);
            return newSet;
        });
    };

    const handleContainerSelect = async (container: Container) => {
        setSelectedContainer(container);
        setActiveTab(0);
        await loadContainerDetails(container);
    };

    const handleCloseDetails = () => {
        setSelectedContainer(null);
        setContainerDetails(null);
        setDetailsError(null);
        setViewingFile(null);
        setFileContent('');
    };

    const handleRefreshDetails = () => {
        if (selectedContainer) loadContainerDetails(selectedContainer);
    };

    const handleContainerAction = async (action: string, container: Container) => {
        console.log('Action:', action, container);
        if (action === 'refresh') refetchContainers();
    };

    const handleFileClick = (file: ApiFile) => {
        setViewingFile(file);
        setFileViewerOpen(true);
    };

    const handleDownloadFile = async (file: ApiFile) => {
        try {
            const blob = await apiClient.downloadFile(file.name, selectedContainer!.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleDeleteFile = async (file: ApiFile) => {
        if (!window.confirm(`Удалить файл "${file.name}"?`)) return;

        try {
            await apiClient.deleteFile(file.name, selectedContainer!.id);
            refetchFiles();
            if (containerDetails) {
                loadContainerDetails(selectedContainer!);
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const totalContainers = containers.length;
    const runningContainers = containers.filter(c => c.status === 'running').length;
    const totalStorage = containers.reduce((sum, c) => sum + (c.storage_quota || 0), 0);
    const totalMemory = containers.reduce((sum, c) => sum + (c.memory_limit || 0), 0);
    const activeUsers = users.filter(u => u.runningContainers > 0).length;

    const chartColors = { cpu: '#ff6b6b', memory: '#4ecdc4', storage: '#45b7d1', gpu: '#f9ca24' };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatPercent = (value: number) => `${Math.round(value)}%`;

    const getFileIcon = (mimeType: string): string => {
        if (mimeType.includes('image')) return '🖼';
        if (mimeType.includes('video')) return '🎬';
        if (mimeType.includes('audio')) return '🎵';
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('json')) return '{}';
        if (mimeType.includes('text') || mimeType.includes('code')) return '📝';
        if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
        return '📁';
    };

    const getFileColor = (mimeType: string): string => {
        if (mimeType.includes('image')) return '#e91e63';
        if (mimeType.includes('video')) return '#9c27b0';
        if (mimeType.includes('audio')) return '#673ab7';
        if (mimeType.includes('pdf')) return '#f44336';
        if (mimeType.includes('json')) return '#ff9800';
        if (mimeType.includes('text') || mimeType.includes('code')) return '#4caf50';
        if (mimeType.includes('zip') || mimeType.includes('archive')) return '#795548';
        return '#607d8b';
    };

    const filteredFiles = useMemo(() => {
        return files.filter(file => {
            const matchesSearch = !fileSearchQuery ||
                file.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
                file.path.toLowerCase().includes(fileSearchQuery.toLowerCase());

            const fileGroups = containerDetails?.fileGroups?.[file.name] || [];
            const matchesGroup = selectedFileGroup === 'all' || fileGroups.includes(selectedFileGroup);

            return matchesSearch && matchesGroup;
        });
    }, [files, fileSearchQuery, selectedFileGroup, containerDetails?.fileGroups]);

    if (usersLoading || containersLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={60} sx={{ mb: 2 }} />
                    <Typography color="text.secondary">Загрузка панели администратора...</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                anchor="left"
                open={isMobile ? drawerOpen : true}
                onClose={() => isMobile && setDrawerOpen(false)}
                sx={{
                    width: drawerOpen ? 360 : 60,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerOpen ? 360 : 60,
                        boxSizing: 'border-box',
                        background: 'linear-gradient(180deg, rgba(18, 22, 40, 0.98) 0%, rgba(26, 32, 54, 0.98) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        overflowX: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {drawerOpen && (
                        <Box>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                                <PeopleIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                Пользователи
                            </Typography>
                            <Chip label={users.length} size="small" sx={{ mt: 0.5, bgcolor: 'primary.main/20', color: 'primary.light', fontWeight: 500 }} />
                        </Box>
                    )}
                    <IconButton onClick={toggleDrawer} size="small" sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'white/10' } }}>
                        {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </Box>

                <List sx={{ flex: 1, overflow: 'auto', py: 1 }}>
                    {users.map((u) => (
                        <React.Fragment key={u.id}>
                            <ListItemButton
                                selected={selectedUserId === u.id}
                                onClick={() => { setSelectedUserId(u.id); toggleUserExpand(u.id); }}
                                sx={{
                                    borderRadius: 2, mx: 1.5, my: 0.5, minHeight: 56,
                                    '&.Mui-selected': { backgroundColor: 'rgba(103, 126, 234, 0.2)', borderLeft: '3px solid', borderLeftColor: 'primary.main' },
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                                }}
                            >
                                <ListItemAvatar>
                                    <Tooltip title={`${u.role}${u.is_active ? '' : ' (неактивен)'}`}>
                                        <Avatar sx={{ bgcolor: u.role === 'super_admin' ? 'error.main' : u.role === 'admin' ? 'warning.main' : 'primary.main', width: 36, height: 36, fontSize: '0.9rem' }}>
                                            {u.name?.[0]?.toUpperCase() || 'U'}
                                        </Avatar>
                                    </Tooltip>
                                </ListItemAvatar>
                                {drawerOpen && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography variant="body2" fontWeight="600" noWrap>{u.name}</Typography>
                                                {(u.role === 'admin' || u.role === 'super_admin') && <AdminIcon fontSize="small" sx={{ color: 'warning.main' }} />}
                                                {!u.is_active && <Chip label="⚠" size="small" sx={{ height: 16, minWidth: 16, p: 0, bgcolor: 'error.main/20', color: 'error.light' }} />}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" noWrap>{u.email}</Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                                <Chip label={`${u.containers.length} конт.`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', borderColor: 'rgba(255,255,255,0.2)' }} />
                                                {u.runningContainers > 0 && <Chip label={`${u.runningContainers} актив.`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'success.main/20', color: 'success.light' }} />}
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {u.containers.length > 0 && (
                                                <Tooltip title={`${u.containers.length} контейнеров`}>
                                                    <Chip
                                                        label={u.containers.length}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            minWidth: 20,
                                                            p: 0,
                                                            bgcolor: 'primary.main/20',
                                                            color: 'primary.light',
                                                            fontWeight: 600,
                                                            fontSize: '0.65rem'
                                                        }}
                                                    />
                                                </Tooltip>
                                            )}
                                            {expandedUsers.has(u.id) ? <ExpandLess sx={{ color: 'text.secondary' }} /> : <ExpandMore sx={{ color: 'text.secondary' }} />}
                                        </Box>
                                    </Box>
                                )}
                            </ListItemButton>

                            <Collapse in={expandedUsers.has(u.id) && drawerOpen} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 7, pr: 2, py: 1 }}>
                                    <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, background: 'rgba(255,255,255,0.04)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Хранилище</Typography>
                                                <Typography variant="body2" fontWeight="600">{formatBytes(u.totalStorage)}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Память</Typography>
                                                <Typography variant="body2" fontWeight="600">{formatBytes(u.totalMemory)}</Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 500 }}>Контейнеры ({u.containers?.length || 0})</Typography>
                                    {u.containers?.map((container) => (
                                        <Paper key={container.id} elevation={0} sx={{ p: 1.5, mb: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 2, cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s', '&:hover': { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(103, 126, 234, 0.3)' } }} onClick={() => handleContainerSelect(container)}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight="600" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <StorageIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.8 }} />{container.id}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                                        <Chip label={container.status} size="small" color={container.status === 'running' ? 'success' : container.status === 'error' ? 'error' : 'warning'} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500 }} />
                                                        <Chip label={container.env_label?.value || '—'} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.1)' }} />
                                                    </Box>
                                                </Box>
                                                <Tooltip title="Открыть детали"><IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.7rem', color: 'text.secondary' }}>
                                                <Box>CPU: {container.cpu_usage?.toFixed(1) || 0}%</Box>
                                                <Box>RAM: {container.memory_usage ? formatBytes(container.memory_usage) : '—'}</Box>
                                            </Box>
                                        </Paper>
                                    ))}
                                    {u.containers?.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Нет активных контейнеров</Typography>}
                                </Box>
                            </Collapse>
                        </React.Fragment>
                    ))}
                </List>

                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(0,0,0,0.1)' }}>
                    {drawerOpen ? (
                        <Box>
                            <Typography variant="caption" color="text.secondary">Всего пользователей: {users.length}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Chip label={`🟢 ${activeUsers}`} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'success.main/20', color: 'success.light' }} />
                                <Chip label={`📦 ${totalContainers}`} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'primary.main/20', color: 'primary.light' }} />
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <Chip label={users.length} size="small" sx={{ width: 24, height: 24, p: 0, minWidth: 'auto' }} />
                            <Chip label={totalContainers} size="small" sx={{ width: 24, height: 24, p: 0, minWidth: 'auto', bgcolor: 'primary.main/30' }} />
                        </Box>
                    )}
                </Box>
            </Drawer>

            <Box sx={{ flexGrow: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, mb: 4 }}>
                    {[
                        { title: 'Всего контейнеров', value: totalContainers, sub: `${runningContainers} запущено`, icon: <StorageIcon />, color: 'primary', progress: totalContainers > 0 ? (runningContainers / totalContainers) * 100 : 0 },
                        { title: 'Общее хранилище', value: `${(totalStorage / 1024 / 1024).toFixed(1)} GB`, sub: 'выделено', icon: <MemoryIcon />, color: 'info', progress: Math.min(100, (totalStorage / (1024 * 1024 * 100)) * 100) },
                        { title: 'Общая память', value: `${(totalMemory / 1024 / 1024).toFixed(1)} GB`, sub: 'аллоцировано', icon: <SpeedIcon />, color: 'warning', progress: Math.min(100, (totalMemory / (1024 * 1024 * 64)) * 100) },
                        { title: 'Активные пользователи', value: activeUsers, sub: `из ${users.length} всего`, icon: <PeopleIcon />, color: 'success', progress: users.length > 0 ? (activeUsers / users.length) * 100 : 0 },
                    ].map((stat, index) => (
                        <Box key={index} sx={{
                            flex: '1 1 calc(25% - 12px)',
                            minWidth: { xs: '100%', sm: 'calc(50% - 12px)', lg: 'calc(25% - 12px)' },
                            maxWidth: { lg: 'calc(25% - 12px)' }
                        }}>
                            <Card sx={{ bgcolor: 'rgba(18, 22, 40, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.15)' } }}>
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>{stat.title}</Typography>
                                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${stat.color}.main/15`, color: `${stat.color}.main` }}>{React.cloneElement(stat.icon as React.ReactElement)}</Box>
                                    </Box>
                                    <Typography variant="h3" fontWeight="700" sx={{ lineHeight: 1.2 }}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{stat.sub}</Typography>
                                    <LinearProgress variant="determinate" value={stat.progress} sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: `${stat.color}.main` } }} />
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                        <Typography variant="h5" fontWeight={600}>Все контейнеры</Typography>
                        <Typography variant="body2" color="text.secondary">Управление и мониторинг контейнеров всех пользователей</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={totalContainers} size="medium" sx={{ fontWeight: 500, bgcolor: 'primary.main/20', color: 'primary.light' }} />
                        <Tooltip title="Обновить данные"><IconButton onClick={() => refetchContainers()} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 } }}>
                    {containers.map((container) => (
                        <Box key={container.id} sx={{
                            flex: '1 1 calc(33.333% - 16px)',
                            minWidth: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.333% - 16px)', xl: 'calc(25% - 18px)' },
                            maxWidth: { xl: 'calc(25% - 18px)' }
                        }}>
                            <ContainerCard container={container} onSelect={handleContainerSelect} onAction={handleContainerAction} />
                        </Box>
                    ))}
                </Box>

                {containers.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 10 }}>
                        <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}><StorageIcon sx={{ fontSize: 40, color: 'text.secondary' }} /></Box>
                        <Typography variant="h6" fontWeight={500} color="text.primary" gutterBottom>Контейнеры не найдены</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>Создайте первый контейнер или дождитесь, пока пользователи добавят свои</Typography>
                    </Box>
                )}
            </Box>

            <Dialog open={!!selectedContainer} onClose={handleCloseDetails} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: 'rgba(18, 22, 40, 0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, m: { xs: 1, md: 2 } } }}>
                {selectedContainer && (
                    <>
                        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: selectedContainer.status === 'running' ? 'success.main/20' : 'warning.main/20', color: selectedContainer.status === 'running' ? 'success.main' : 'warning.main' }}><StorageIcon /></Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>{selectedContainer.id}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Chip label={selectedContainer.status} size="small" color={selectedContainer.status === 'running' ? 'success' : selectedContainer.status === 'error' ? 'error' : 'warning'} sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500 }} />
                                        <Typography variant="caption" color="text.secondary">Создан: {new Date(selectedContainer.created_at).toLocaleDateString('ru-RU')}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title={autoRefresh ? 'Автообновление включено' : 'Автообновление выключено'}><IconButton onClick={() => setAutoRefresh(!autoRefresh)} size="small" sx={{ color: autoRefresh ? 'success.main' : 'text.secondary', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Обновить"><IconButton onClick={handleRefreshDetails} disabled={detailsLoading} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>{detailsLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}</IconButton></Tooltip>
                                <IconButton onClick={handleCloseDetails} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}><CloseIcon /></IconButton>
                            </Box>
                        </DialogTitle>

                        <DialogContent sx={{ pt: 3 }}>
                            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3, borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, minHeight: 40 }, '& .Mui-selected': { color: 'primary.main !important' } }}>
                                <Tab icon={<TimelineIcon fontSize="small" />} iconPosition="start" label="Мониторинг" />
                                <Tab icon={<GroupIcon fontSize="small" />} iconPosition="start" label={`Группы (${containerDetails?.groups?.length || 0})`} />
                                <Tab icon={<FolderIcon fontSize="small" />} iconPosition="start" label="Файлы" />
                                <Tab icon={<InfoIcon fontSize="small" />} iconPosition="start" label="Информация" />
                            </Tabs>

                            {detailsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDetailsError(null)}>{detailsError}</Alert>}

                            {activeTab === 0 && (
                                <Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                                        {[
                                            { label: 'CPU', value: containerDetails?.stats?.cpu_usage ?? selectedContainer.cpu_usage ?? 0, unit: '%', color: chartColors.cpu, icon: <CpuIcon fontSize="small" /> },
                                            { label: 'RAM', value: containerDetails?.stats?.memory_usage ?? selectedContainer.memory_usage ?? 0, unit: 'MB', color: chartColors.memory, icon: <MemoryIcon fontSize="small" />, format: formatBytes },
                                            { label: 'Хранилище', value: containerDetails?.stats?.storage_used ?? selectedContainer.storage_quota ?? 0, unit: 'MB', color: chartColors.storage, icon: <StorageIcon fontSize="small" />, format: formatBytes },
                                            { label: 'GPU', value: containerDetails?.stats?.gpu_usage ?? 0, unit: '%', color: chartColors.gpu, icon: <GpuIcon fontSize="small" /> },
                                        ].map((metric, idx) => (
                                            <Box key={idx} sx={{ flex: '1 1 calc(25% - 12px)', minWidth: { xs: 'calc(50% - 8px)', sm: 'calc(25% - 12px)' } }}>
                                                <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 1, color: metric.color }}>{metric.icon}<Typography variant="caption" fontWeight={500}>{metric.label}</Typography></Box>
                                                    <Typography variant="h4" fontWeight={700}>{metric.format ? metric.format(metric.value) : formatPercent(metric.value)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{metric.unit}</Typography>
                                                </Paper>
                                            </Box>
                                        ))}
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                        <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', lg: 'calc(50% - 12px)' } }}>
                                            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><CpuIcon fontSize="small" sx={{ color: chartColors.cpu }} />Загрузка CPU и памяти</Typography>
                                                <Box sx={{ height: 250 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={containerDetails?.history || []}>
                                                            <defs>
                                                                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColors.cpu} stopOpacity={0.3} /><stop offset="95%" stopColor={chartColors.cpu} stopOpacity={0} /></linearGradient>
                                                                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chartColors.memory} stopOpacity={0.3} /><stop offset="95%" stopColor={chartColors.memory} stopOpacity={0} /></linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                                                            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} tickFormatter={(v) => `${v}%`} />
                                                            <RechartsTooltip contentStyle={{ background: 'rgba(18, 22, 40, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                                                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                                            <Area type="monotone" dataKey="cpu" name="CPU %" stroke={chartColors.cpu} fill="url(#cpuGradient)" strokeWidth={2} />
                                                            <Area type="monotone" dataKey="memory" name="RAM %" stroke={chartColors.memory} fill="url(#memGradient)" strokeWidth={2} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </Box>
                                            </Paper>
                                        </Box>
                                        <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', lg: 'calc(50% - 12px)' } }}>
                                            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><GpuIcon fontSize="small" sx={{ color: chartColors.gpu }} />GPU и хранилище</Typography>
                                                <Box sx={{ height: 250 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={containerDetails?.history || []}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                                                            <YAxis yAxisId="left" stroke={chartColors.gpu} fontSize={10} tickFormatter={(v) => `${v}%`} />
                                                            <YAxis yAxisId="right" orientation="right" stroke={chartColors.storage} fontSize={10} tickFormatter={(v) => `${(v / 1024).toFixed(0)}GB`} />
                                                            <RechartsTooltip contentStyle={{ background: 'rgba(18, 22, 40, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                                                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                                            <Line yAxisId="left" type="monotone" dataKey="gpu" name="GPU %" stroke={chartColors.gpu} strokeWidth={2} dot={false} />
                                                            <Line yAxisId="right" type="monotone" dataKey="storage" name="Storage" stroke={chartColors.storage} strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </Box>
                                            </Paper>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {activeTab === 1 && (
                                <Box>
                                    {containerDetails?.groups && containerDetails.groups.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {containerDetails.groups.map((group) => {
                                                const stats = containerDetails.groupStats[group.id];
                                                return (
                                                    <Box key={group.id} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                                                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: `2px solid ${group.color || '#ff9800'}40`, '&:hover': { borderColor: `${group.color || '#ff9800'}80` } }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                                <Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: group.color || '#ff9800' }} />
                                                                        <Typography variant="subtitle1" fontWeight={600}>{group.id}</Typography>
                                                                    </Box>
                                                                    {group.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{group.description}</Typography>}
                                                                </Box>
                                                                <Chip label={`${stats?.total_files || 0} файлов`} size="small" sx={{ height: 24, fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)' }} />
                                                            </Box>
                                                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                                                <Box><Typography variant="caption" color="text.secondary">Размер</Typography><Typography variant="body2" fontWeight={500}>{formatBytes(stats?.total_size || 0)}</Typography></Box>
                                                                <Box><Typography variant="caption" color="text.secondary">Средний файл</Typography><Typography variant="body2" fontWeight={500}>{formatBytes(stats?.average_file_size || 0)}</Typography></Box>
                                                            </Box>
                                                            {stats?.files && stats.files.length > 0 && (
                                                                <Box sx={{ height: 80 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.files.slice(0, 10).map((f, i) => ({ name: i, size: f.size }))}><Area type="monotone" dataKey="size" stroke={group.color || '#ff9800'} fill={`${group.color || '#ff9800'}30`} strokeWidth={2} /></AreaChart></ResponsiveContainer></Box>
                                                            )}
                                                        </Paper>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ) : (
                                        <Box sx={{ textAlign: 'center', py: 6 }}><GroupIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} /><Typography color="text.secondary">Группы не созданы</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Создайте группы для организации файлов в этом контейнере</Typography></Box>
                                    )}
                                </Box>
                            )}

                            {activeTab === 2 && selectedContainer && (
                                <Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
                                        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                                            <TextField size="small" placeholder="Поиск файлов..." value={fileSearchQuery}
                                                onChange={(e) => setFileSearchQuery(e.target.value)}
                                                InputProps={{
                                                    startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
                                                    sx: { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }
                                                }}
                                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }} />
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                            <Select value={selectedFileGroup} onChange={(e) => setSelectedFileGroup(e.target.value)} displayEmpty
                                                sx={{ color: 'text.primary', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                                                <MenuItem value="all">Все группы</MenuItem>
                                                {containerDetails?.groups?.map(group => (
                                                    <MenuItem key={group.id} value={group.id}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: group.color }} />{group.id}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Tooltip title="Обновить список">
                                            <IconButton onClick={() => refetchFiles()} disabled={filesLoading} size="small"
                                                sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
                                                {filesLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>
                                        <Chip label={`${filteredFiles.length} файлов`} size="small" sx={{ bgcolor: 'primary.main/20', color: 'primary.light' }} />
                                    </Box>

                                    {filesLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                                    ) : filteredFiles.length === 0 ? (
                                        <Paper elevation={0} sx={{ p: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                            <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                                            <Typography color="text.secondary">{fileSearchQuery || selectedFileGroup !== 'all' ? 'Файлы не найдены' : 'В контейнере нет файлов'}</Typography>
                                        </Paper>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 500, overflow: 'auto', pr: 1 }}>
                                            {filteredFiles.map((file) => {
                                                const fileGroups = containerDetails?.fileGroups?.[file.name] || [];
                                                return (
                                                    <Paper key={file.name} elevation={0} sx={{
                                                        p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(103, 126, 234, 0.3)' }
                                                    }}
                                                        onClick={() => handleFileClick(file)}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                                                            <Box sx={{
                                                                width: 40, height: 40, borderRadius: 2, bgcolor: getFileColor(file.mime_type),
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.75rem'
                                                            }}>
                                                                {getFileIcon(file.mime_type)}
                                                            </Box>
                                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                <Typography variant="body2" fontWeight={500} noWrap>{file.name}</Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary">{formatBytes(file.size)}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{file.mime_type}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{new Date(file.created_at).toLocaleDateString('ru-RU')}</Typography>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                                                            {fileGroups.slice(0, 3).map(groupId => {
                                                                const group = containerDetails?.groups?.find(g => g.id === groupId);
                                                                return group ? <Tooltip key={groupId} title={group.id}><Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: group.color, border: '2px solid rgba(0,0,0,0.3)' }} /></Tooltip> : null;
                                                            })}
                                                            {fileGroups.length > 3 && <Typography variant="caption" color="text.secondary">+{fileGroups.length - 3}</Typography>}
                                                        </Box>
                                                        <Tooltip title="Просмотр">
                                                            <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                                                <DescriptionIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Paper>
                                                );
                                            })}
                                        </Box>
                                    )}

                                    {/* Viewer для файла */}
                                    <AdminFileViewer
                                        open={fileViewerOpen}
                                        onClose={() => { setFileViewerOpen(false); setViewingFile(null); }}
                                        file={viewingFile}
                                        containerId={selectedContainer.id}
                                        allFiles={files}
                                        onFileChange={(newFile) => setViewingFile(newFile)}
                                        searchQuery={fileSearchQuery}
                                    />
                                </Box>
                            )}

                            {activeTab === 3 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>📋 Конфигурация</Typography>
                                            <Stack spacing={1.5}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">ID контейнера</Typography><Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedContainer.id}</Typography></Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Пользователь</Typography><Typography variant="body2" fontWeight={500}>{users.find(u => u.id === selectedContainer.user_id)?.name || selectedContainer.user_id}</Typography></Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Окружение</Typography><Chip label={selectedContainer.env_label?.value || '—'} size="small" sx={{ height: 22, fontSize: '0.7rem' }} /></Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Тип</Typography><Chip label={selectedContainer.type_label?.value || '—'} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', borderColor: 'rgba(255,255,255,0.2)' }} /></Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Создан</Typography><Typography variant="body2" fontWeight={500}>{new Date(selectedContainer.created_at).toLocaleString('ru-RU')}</Typography></Box>
                                            </Stack>
                                        </Paper>
                                    </Box>
                                    <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>⚙️ Лимиты</Typography>
                                            <Stack spacing={2}>
                                                {[
                                                    { label: 'Лимит памяти', value: formatBytes(selectedContainer.memory_limit || 0), progress: ((selectedContainer.memory_usage || 0) / (selectedContainer.memory_limit || 1)) * 100, color: 'warning' },
                                                    { label: 'Квота хранилища', value: formatBytes(selectedContainer.storage_quota || 0), progress: 100, color: 'info' },
                                                    { label: 'Лимит файлов', value: selectedContainer.file_limit?.toLocaleString() || '∞', progress: 0, color: 'primary' },
                                                ].map((limit, idx) => (
                                                    <Box key={idx}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Typography variant="body2" color="text.secondary">{limit.label}</Typography><Typography variant="body2" fontWeight={500}>{limit.value}</Typography></Box>
                                                        <LinearProgress variant="determinate" value={Math.min(100, limit.progress)} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: `${limit.color}.main` } }} />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Box>
                                    <Box sx={{ width: '100%' }}>
                                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>🔐 Права доступа</Typography>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip icon={<StorageIcon fontSize="small" />} label={selectedContainer.privileged ? 'Privileged mode' : 'Standard mode'} color={selectedContainer.privileged ? 'error' : 'success'} size="small" sx={{ fontWeight: 500 }} />
                                                {selectedContainer.commands?.map((cmd, idx) => (<Chip key={idx} label={`cmd: ${cmd}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }} />))}
                                            </Box>
                                        </Paper>
                                    </Box>
                                </Box>
                            )}
                        </DialogContent>

                        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <Button onClick={handleCloseDetails} variant="outlined" color="inherit">Закрыть</Button>
                            <Box sx={{ flexGrow: 1 }} />
                            {selectedContainer.status === 'running' && (<>
                                <Button variant="outlined" color="warning" onClick={() => handleContainerAction('stop', selectedContainer)}>Остановить</Button>
                                <Button variant="outlined" onClick={() => handleContainerAction('restart', selectedContainer)} sx={{ ml: 1 }}>Перезапустить</Button>
                            </>)}
                            <Button variant="contained" color="error" onClick={() => handleContainerAction('delete', selectedContainer)} sx={{ ml: 1 }}>Удалить</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};