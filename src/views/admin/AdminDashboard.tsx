import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Box,
    Typography,
    Drawer,
    List,
    ListItemAvatar,
    Avatar,
    Chip,
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
    InputLabel,
    Checkbox,
    FormControlLabel,
    Snackbar,
    Badge,
    Skeleton,
    ToggleButton,
    ToggleButtonGroup,
    Menu,
    InputAdornment,
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
    Delete as DeleteIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Security as SecurityIcon,
    Lock as LockIcon,
    PersonAdd as PersonAddIcon,
    PersonRemove as PersonRemoveIcon,
    CloudUpload as CloudUploadIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    Deselect as DeselectIcon,
    ViewList as ViewListIcon,
    ViewModule as ViewModuleIcon,
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

import {
    useAllContainersForAdmin,
    useAllUsers,
    useFiles,
    useUpdateUserRole,
    useUpdateUserStatus,
    useUserGroups,
    useCreateUserGroup,
    useDeleteUserGroup,
    useUpdateUserGroup,
    useGroupMembers,
    useAddUserToGroup,
    useRemoveUserFromGroup,
    useUpdateMemberRole,
    useContainerAccesses,
    useGrantContainerAccess,
    useRevokeContainerAccess,
    useCreateContainerAsAdmin,
} from '../../hooks/useApi';
import { ContainerCard } from '../../components/containers/ContainerCard';
import { apiClient } from '../../api/client';
import type {
    User,
    Container,
    Group,
    GroupStats,
    ApiFile,
    UserGroup,
    CreateContainerRequest,
} from '../../api/client';
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

const AVAILABLE_ROLES = ['user', 'moderator', 'admin', 'super_admin'];
const AVAILABLE_PERMISSIONS = ['read', 'read_write', 'admin'];
const GROUP_COLORS = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
];

const ROLE_COLORS: Record<string, string> = {
    user: '#2196f3',
    moderator: '#ff9800',
    admin: '#f44336',
    super_admin: '#9c27b0',
};

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
    const [viewingFile, setViewingFile] = useState<ApiFile | null>(null);
    const [fileViewerOpen, setFileViewerOpen] = useState(false);

    const [adminActiveTab, setAdminActiveTab] = useState(0);

    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userFilterRole, setUserFilterRole] = useState<string>('all');
    const [userFilterStatus, setUserFilterStatus] = useState<string>('all');
    const [userSortBy, setUserSortBy] = useState<string>('name');
    const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');

    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [bulkActionMenuAnchor, setBulkActionMenuAnchor] = useState<null | HTMLElement>(null);

    const [roleEditDialogOpen, setRoleEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<EnrichedUser | null>(null);
    const [newRole, setNewRole] = useState<string>('user');

    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);

    const [membersDialogOpen, setMembersDialogOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
    const [addMemberUserId, setAddMemberUserId] = useState<string>('');
    const [addMemberRole, setAddMemberRole] = useState<string>('member');

    const [accessDialogOpen, setAccessDialogOpen] = useState(false);
    const [accessGroupId, setAccessGroupId] = useState<string>('');
    const [accessPermission, setAccessPermission] = useState<string>('read_write');

    const [createContainerDialogOpen, setCreateContainerDialogOpen] = useState(false);
    const [newContainerUserId, setNewContainerUserId] = useState<string>('');
    const [newContainerId, setNewContainerId] = useState('');
    const [newContainerMemory, setNewContainerMemory] = useState(512);
    const [newContainerStorage, setNewContainerStorage] = useState(1024);
    const [newContainerFileLimit, setNewContainerFileLimit] = useState(1000);
    const [newContainerPrivileged, setNewContainerPrivileged] = useState(false);
    const [newContainerCommands, setNewContainerCommands] = useState('');

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        severity?: 'error' | 'warning' | 'info';
    }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {},
        severity: 'warning',
    });

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
        open: false,
        message: '',
        severity: 'info',
    });

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const searchInputRef = useRef<HTMLInputElement>(null);

    const { data: containers = [], isLoading: containersLoading, refetch: refetchContainers } = useAllContainersForAdmin();
    const { data: usersList = [], isLoading: usersLoading, refetch: refetchUsers } = useAllUsers();
    const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useFiles(selectedContainer?.id);

    const { data: userGroups = [], isLoading: groupsLoading, refetch: refetchUserGroups } = useUserGroups();

    const updateRoleMutation = useUpdateUserRole();
    const updateStatusMutation = useUpdateUserStatus();
    const createGroupMutation = useCreateUserGroup();
    const deleteGroupMutation = useDeleteUserGroup();
    const updateGroupMutation = useUpdateUserGroup();
    const addMemberMutation = useAddUserToGroup();
    const removeMemberMutation = useRemoveUserFromGroup();
    const updateMemberRoleMutation = useUpdateMemberRole();
    const grantAccessMutation = useGrantContainerAccess();
    const revokeAccessMutation = useRevokeContainerAccess();
    const createContainerAsAdminMutation = useCreateContainerAsAdmin();

    const { data: selectedGroupMembers = [] } = useGroupMembers(selectedGroup?.id);
    const { data: containerAccesses = [] } = useContainerAccesses(selectedContainer?.id);

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

    const filteredUsers = useMemo(() => {
        let result = users;

        if (userSearchQuery) {
            const query = userSearchQuery.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                u.id.toLowerCase().includes(query)
            );
        }

        if (userFilterRole !== 'all') {
            result = result.filter(u => u.role === userFilterRole);
        }

        if (userFilterStatus !== 'all') {
            result = result.filter(u =>
                userFilterStatus === 'active' ? u.is_active : !u.is_active
            );
        }

        result = [...result].sort((a, b) => {
            let comparison = 0;
            if (userSortBy === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (userSortBy === 'email') {
                comparison = a.email.localeCompare(b.email);
            } else if (userSortBy === 'role') {
                comparison = a.role.localeCompare(b.role);
            } else if (userSortBy === 'containers') {
                comparison = a.containers.length - b.containers.length;
            }
            return userSortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [users, userSearchQuery, userFilterRole, userFilterStatus, userSortBy, userSortOrder]);

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

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedContainer) handleCloseDetails();
                if (roleEditDialogOpen) setRoleEditDialogOpen(false);
                if (groupDialogOpen) setGroupDialogOpen(false);
                if (membersDialogOpen) setMembersDialogOpen(false);
                if (accessDialogOpen) setAccessDialogOpen(false);
                if (createContainerDialogOpen) setCreateContainerDialogOpen(false);
                if (confirmDialog.open) setConfirmDialog(prev => ({ ...prev, open: false }));
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedContainer, roleEditDialogOpen, groupDialogOpen, membersDialogOpen, accessDialogOpen, createContainerDialogOpen, confirmDialog.open]);

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

    const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, severity: 'error' | 'warning' | 'info' = 'warning') => {
        setConfirmDialog({ open: true, title, message, onConfirm, severity });
    };

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
    };

    const handleRefreshDetails = () => {
        if (selectedContainer) loadContainerDetails(selectedContainer);
    };

    const handleContainerAction = async (action: string, container: Container) => {
        if (action === 'refresh') refetchContainers();
        if (action === 'delete') {
            showConfirm(
                'Удалить контейнер?',
                `Вы уверены, что хотите удалить контейнер "${container.id}"? Это действие необратимо.`,
                async () => {
                    try {
                        await apiClient.deleteContainer(container.id);
                        refetchContainers();
                        showSnackbar('Контейнер удалён', 'success');
                        handleCloseDetails();
                    } catch (error) {
                        showSnackbar('Ошибка при удалении контейнера', 'error');
                    }
                },
                'error'
            );
        }
        if (action === 'stop') {
            showConfirm(
                'Остановить контейнер?',
                `Вы уверены, что хотите остановить контейнер "${container.id}"?`,
                async () => {
                    try {
                        await apiClient.stopContainer(container.id);
                        refetchContainers();
                        showSnackbar('Контейнер остановлен', 'success');
                    } catch (error) {
                        showSnackbar('Ошибка при остановке контейнера', 'error');
                    }
                },
                'warning'
            );
        }
        if (action === 'restart') {
            showConfirm(
                'Перезапустить контейнер?',
                `Вы уверены, что хотите перезапустить контейнер "${container.id}"?`,
                async () => {
                    try {
                        await apiClient.restartContainer(container.id);
                        refetchContainers();
                        showSnackbar('Контейнер перезапущен', 'success');
                    } catch (error) {
                        showSnackbar('Ошибка при перезапуске контейнера', 'error');
                    }
                },
                'info'
            );
        }
    };

    const handleFileClick = (file: ApiFile) => {
        setViewingFile(file);
        setFileViewerOpen(true);
    };

    const handleDeleteFile = async (file: ApiFile) => {
        showConfirm(
            'Удалить файл?',
            `Вы уверены, что хотите удалить файл "${file.name}"?`,
            async () => {
                try {
                    await apiClient.deleteFile(file.name, selectedContainer!.id);
                    refetchFiles();
                    if (containerDetails) {
                        loadContainerDetails(selectedContainer!);
                    }
                    showSnackbar('Файл удалён', 'success');
                } catch (error) {
                    showSnackbar('Ошибка при удалении файла', 'error');
                }
            },
            'error'
        );
    };

    const handleOpenRoleEditDialog = (u: EnrichedUser) => {
        setEditingUser(u);
        setNewRole(u.role);
        setRoleEditDialogOpen(true);
    };

    const handleSaveRole = async () => {
        if (!editingUser) return;
        try {
            await updateRoleMutation.mutateAsync({ userId: editingUser.id, role: newRole });
            showSnackbar(`Роль пользователя ${editingUser.name} изменена на ${newRole}`, 'success');
            setRoleEditDialogOpen(false);
        } catch (error) {
            showSnackbar('Ошибка при обновлении роли', 'error');
        }
    };

    const handleToggleUserStatus = async (u: EnrichedUser) => {
        const newStatus = !u.is_active;
        const action = newStatus ? 'активировать' : 'деактивировать';
        showConfirm(
            `${newStatus ? 'Активировать' : 'Деактивировать'} пользователя?`,
            `Вы уверены, что хотите ${action} пользователя "${u.name}"?`,
            async () => {
                try {
                    await updateStatusMutation.mutateAsync({ userId: u.id, isActive: newStatus });
                    showSnackbar(`Пользователь ${u.name} ${newStatus ? 'активирован' : 'деактивирован'}`, 'success');
                } catch (error) {
                    showSnackbar('Ошибка при изменении статуса', 'error');
                }
            },
            newStatus ? 'info' : 'warning'
        );
    };

    const handleOpenCreateGroupDialog = () => {
        setEditingGroup(null);
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupColor(GROUP_COLORS[0]);
        setGroupDialogOpen(true);
    };

    const handleOpenEditGroupDialog = (group: UserGroup) => {
        setEditingGroup(group);
        setNewGroupName(group.id);
        setNewGroupDescription(group.description || '');
        setNewGroupColor(group.color || GROUP_COLORS[0]);
        setGroupDialogOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!newGroupName.trim()) {
            showSnackbar('Введите название группы', 'warning');
            return;
        }
        try {
            if (editingGroup) {
                await updateGroupMutation.mutateAsync({
                    groupId: editingGroup.id,
                    data: { name: newGroupName, description: newGroupDescription, color: newGroupColor },
                });
                showSnackbar('Группа обновлена', 'success');
            } else {
                await createGroupMutation.mutateAsync({
                    name: newGroupName,
                    description: newGroupDescription,
                    color: newGroupColor,
                });
                showSnackbar('Группа создана', 'success');
            }
            setGroupDialogOpen(false);
            refetchUserGroups();
        } catch (error) {
            showSnackbar('Ошибка при сохранении группы', 'error');
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        showConfirm(
            'Удалить группу?',
            'Это действие необратимо. Все участники будут удалены из группы, а доступы к контейнерам отозваны.',
            async () => {
                try {
                    await deleteGroupMutation.mutateAsync(groupId);
                    showSnackbar('Группа удалена', 'success');
                    refetchUserGroups();
                } catch (error) {
                    showSnackbar('Ошибка при удалении группы', 'error');
                }
            },
            'error'
        );
    };

    const handleOpenMembersDialog = (group: UserGroup) => {
        setSelectedGroup(group);
        setAddMemberUserId('');
        setAddMemberRole('member');
        setMembersDialogOpen(true);
    };

    const handleAddMember = async () => {
        if (!selectedGroup || !addMemberUserId) return;
        try {
            await addMemberMutation.mutateAsync({
                groupId: selectedGroup.id,
                userId: addMemberUserId,
                role: addMemberRole,
            });
            showSnackbar('Пользователь добавлен в группу', 'success');
            setAddMemberUserId('');
        } catch (error) {
            showSnackbar('Ошибка при добавлении пользователя', 'error');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!selectedGroup) return;
        showConfirm(
            'Удалить пользователя из группы?',
            'Пользователь потеряет доступ к контейнерам этой группы.',
            async () => {
                try {
                    await removeMemberMutation.mutateAsync({ groupId: selectedGroup.id, userId });
                    showSnackbar('Пользователь удалён из группы', 'success');
                } catch (error) {
                    showSnackbar('Ошибка при удалении пользователя', 'error');
                }
            },
            'warning'
        );
    };

    const handleChangeMemberRole = async (userId: string, role: string) => {
        if (!selectedGroup) return;
        try {
            await updateMemberRoleMutation.mutateAsync({ groupId: selectedGroup.id, userId, role });
            showSnackbar('Роль участника обновлена', 'success');
        } catch (error) {
            showSnackbar('Ошибка при обновлении роли', 'error');
        }
    };

    const handleOpenAccessDialog = () => {
        setAccessGroupId('');
        setAccessPermission('read_write');
        setAccessDialogOpen(true);
    };

    const handleGrantAccess = async () => {
        if (!selectedContainer || !accessGroupId) return;
        try {
            await grantAccessMutation.mutateAsync({
                containerId: selectedContainer.id,
                groupId: accessGroupId,
                permission: accessPermission,
            });
            showSnackbar('Доступ предоставлен', 'success');
            setAccessDialogOpen(false);
        } catch (error) {
            showSnackbar('Ошибка при предоставлении доступа', 'error');
        }
    };

    const handleRevokeAccess = async (groupId: string) => {
        if (!selectedContainer) return;
        showConfirm(
            'Отозвать доступ?',
            'Группа потеряет доступ к этому контейнеру.',
            async () => {
                try {
                    await revokeAccessMutation.mutateAsync({ containerId: selectedContainer.id, groupId });
                    showSnackbar('Доступ отозван', 'success');
                } catch (error) {
                    showSnackbar('Ошибка при отзыве доступа', 'error');
                }
            },
            'warning'
        );
    };

    const handleOpenCreateContainerDialog = (userId?: string) => {
        setNewContainerUserId(userId || (users.length > 0 ? users[0].id : ''));
        setNewContainerId('');
        setNewContainerMemory(512);
        setNewContainerStorage(1024);
        setNewContainerFileLimit(1000);
        setNewContainerPrivileged(false);
        setNewContainerCommands('');
        setCreateContainerDialogOpen(true);
    };

    const handleCreateContainerAsAdmin = async () => {
        if (!newContainerUserId || !newContainerId.trim()) {
            showSnackbar('Заполните обязательные поля', 'warning');
            return;
        }
        try {
            const requestData: CreateContainerRequest = {
                container_id: newContainerId.trim(),
                user_id: newContainerUserId,
                memory_limit: newContainerMemory * 1024 * 1024,
                storage_quota: newContainerStorage * 1024 * 1024,
                file_limit: newContainerFileLimit,
                env_label: { key: 'default', value: 'Default' },
                type_label: { key: 'standard', value: 'Standard' },
                commands: newContainerCommands.split('\n').filter(c => c.trim()),
                privileged: newContainerPrivileged,
            };
            await createContainerAsAdminMutation.mutateAsync(requestData);
            showSnackbar('Контейнер создан', 'success');
            setCreateContainerDialogOpen(false);
            refetchContainers();
            refetchUsers();
        } catch (error: any) {
            const message = error?.response?.data?.detail || 'Ошибка при создании контейнера';
            showSnackbar(message, 'error');
        }
    };

    const handleSelectUser = (userId: string) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleBulkAction = async (action: string) => {
        setBulkActionMenuAnchor(null);
        if (selectedUsers.size === 0) {
            showSnackbar('Выберите пользователей', 'warning');
            return;
        }

        if (action === 'activate') {
            showConfirm(
                'Активировать пользователей?',
                `Вы уверены, что хотите активировать ${selectedUsers.size} пользователей?`,
                async () => {
                    try {
                        for (const userId of selectedUsers) {
                            await updateStatusMutation.mutateAsync({ userId, isActive: true });
                        }
                        showSnackbar(`${selectedUsers.size} пользователей активировано`, 'success');
                        setSelectedUsers(new Set());
                    } catch (error) {
                        showSnackbar('Ошибка при активации', 'error');
                    }
                },
                'info'
            );
        }
        if (action === 'deactivate') {
            showConfirm(
                'Деактивировать пользователей?',
                `Вы уверены, что хотите деактивировать ${selectedUsers.size} пользователей?`,
                async () => {
                    try {
                        for (const userId of selectedUsers) {
                            await updateStatusMutation.mutateAsync({ userId, isActive: false });
                        }
                        showSnackbar(`${selectedUsers.size} пользователей деактивировано`, 'success');
                        setSelectedUsers(new Set());
                    } catch (error) {
                        showSnackbar('Ошибка при деактивации', 'error');
                    }
                },
                'warning'
            );
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
            <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
                <Box sx={{ width: 360, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ p: 2 }}>
                        <Skeleton variant="text" width={200} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        <Skeleton variant="rounded" height={30} sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <Skeleton variant="rounded" height={36} sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                    </Box>
                    {[1, 2, 3, 4, 5].map(i => (
                        <Box key={i} sx={{ px: 1.5, py: 1 }}>
                            <Skeleton variant="rounded" height={70} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        </Box>
                    ))}
                </Box>
                <Box sx={{ flex: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} variant="rounded" width="25%" height={140} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Box>
                            <Skeleton variant="text" width={300} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                            <Skeleton variant="text" width={400} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} variant="rounded" width="calc(33.333% - 16px)" height={200} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        ))}
                    </Box>
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
                                Администрирование
                            </Typography>
                            <Chip label={users.length} size="small" sx={{ mt: 0.5, bgcolor: 'primary.main/20', color: 'primary.light', fontWeight: 500 }} />
                        </Box>
                    )}
                    <IconButton onClick={toggleDrawer} size="small" sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'white/10' } }}>
                        {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </Box>

                {drawerOpen && (
                    <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <Tabs value={adminActiveTab} onChange={(_, v) => setAdminActiveTab(v)} variant="fullWidth" sx={{
                            '& .MuiTab-root': { textTransform: 'none', fontSize: '0.75rem', minHeight: 36 },
                            '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
                        }}>
                            <Tab label="Пользователи" />
                            <Tab label="Группы" />
                        </Tabs>
                    </Box>
                )}

                {drawerOpen && adminActiveTab === 0 && (
                    <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <TextField
                            inputRef={searchInputRef}
                            size="small"
                            fullWidth
                            placeholder="Поиск пользователей... (Ctrl+K)"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: userSearchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setUserSearchQuery('')}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }
                            }}
                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                        />
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <Select
                                    value={userFilterRole}
                                    onChange={(e) => setUserFilterRole(e.target.value)}
                                    displayEmpty
                                    sx={{ fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.05)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                                >
                                    <MenuItem value="all">Все роли</MenuItem>
                                    {AVAILABLE_ROLES.map(role => (
                                        <MenuItem key={role} value={role}>{role}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <Select
                                    value={userFilterStatus}
                                    onChange={(e) => setUserFilterStatus(e.target.value)}
                                    displayEmpty
                                    sx={{ fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.05)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                                >
                                    <MenuItem value="all">Все</MenuItem>
                                    <MenuItem value="active">Активные</MenuItem>
                                    <MenuItem value="inactive">Неактивные</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ flex: 1 }}>
                                <Select
                                    value={userSortBy}
                                    onChange={(e) => setUserSortBy(e.target.value)}
                                    sx={{ fontSize: '0.75rem', bgcolor: 'rgba(255,255,255,0.05)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                                >
                                    <MenuItem value="name">По имени</MenuItem>
                                    <MenuItem value="email">По email</MenuItem>
                                    <MenuItem value="role">По роли</MenuItem>
                                    <MenuItem value="containers">По контейнерам</MenuItem>
                                </Select>
                            </FormControl>
                            <IconButton
                                size="small"
                                onClick={() => setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                            >
                                {userSortOrder === 'asc' ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                            </IconButton>
                        </Box>
                    </Box>
                )}

                {selectedUsers.size > 0 && drawerOpen && adminActiveTab === 0 && (
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.main/10', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="primary.light" fontWeight={600}>
                            Выбрано: {selectedUsers.size}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Массовые действия">
                                <IconButton
                                    size="small"
                                    onClick={(e) => setBulkActionMenuAnchor(e.currentTarget)}
                                    sx={{ color: 'primary.light' }}
                                >
                                    <MoreVertIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Menu
                                anchorEl={bulkActionMenuAnchor}
                                open={Boolean(bulkActionMenuAnchor)}
                                onClose={() => setBulkActionMenuAnchor(null)}
                            >
                                <MenuItem onClick={() => handleBulkAction('activate')}>
                                    <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                                    Активировать
                                </MenuItem>
                                <MenuItem onClick={() => handleBulkAction('deactivate')}>
                                    <ErrorIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                                    Деактивировать
                                </MenuItem>
                            </Menu>
                            <Tooltip title="Снять выделение">
                                <IconButton size="small" onClick={() => setSelectedUsers(new Set())} sx={{ color: 'text.secondary' }}>
                                    <DeselectIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                )}

                <List sx={{ flex: 1, overflow: 'auto', py: 1 }}>
                    {adminActiveTab === 0 && filteredUsers.map((u) => (
                        <React.Fragment key={u.id}>
                            <ListItemButton
                                selected={selectedUserId === u.id}
                                onClick={() => { setSelectedUserId(u.id); toggleUserExpand(u.id); }}
                                sx={{
                                    borderRadius: 2, mx: 1.5, my: 0.5, minHeight: 56,
                                    '&.Mui-selected': { backgroundColor: 'rgba(103, 126, 234, 0.2)', borderLeft: '3px solid', borderLeftColor: 'primary.main' },
                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                                    position: 'relative',
                                }}
                            >
                                <Checkbox
                                    checked={selectedUsers.has(u.id)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleSelectUser(u.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    size="small"
                                    sx={{ mr: 1, p: 0 }}
                                />
                                <ListItemAvatar>
                                    <Tooltip title={`${u.role}${u.is_active ? '' : ' (неактивен)'}`}>
                                        <Badge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            color={u.is_active ? 'success' : 'error'}
                                            invisible={!u.is_active}
                                        >
                                            <Avatar sx={{
                                                bgcolor: ROLE_COLORS[u.role] || 'primary.main',
                                                width: 36,
                                                height: 36,
                                                fontSize: '0.9rem',
                                            }}>
                                                {u.name?.[0]?.toUpperCase() || 'U'}
                                            </Avatar>
                                        </Badge>
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
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Tooltip title="Изменить роль">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenRoleEditDialog(u); }} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                                    <SecurityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={u.is_active ? 'Деактивировать' : 'Активировать'}>
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleUserStatus(u); }} sx={{ color: u.is_active ? 'success.main' : 'error.main' }}>
                                                    {u.is_active ? <PersonRemoveIcon fontSize="small" /> : <PersonAddIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={`Создать контейнер для ${u.name}`}>
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenCreateContainerDialog(u.id); }} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                                    <AddIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {expandedUsers.has(u.id) ? <ExpandLess sx={{ color: 'text.secondary' }} /> : <ExpandMore sx={{ color: 'text.secondary' }} />}
                                        </Box>
                                    </Box>
                                )}
                            </ListItemButton>

                            <Collapse in={expandedUsers.has(u.id) && drawerOpen} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 7, pr: 2, py: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>Контейнеры ({u.containers?.length || 0})</Typography>
                                        <Tooltip title="Создать контейнер">
                                            <IconButton size="small" onClick={() => handleOpenCreateContainerDialog(u.id)} sx={{ color: 'primary.main' }}>
                                                <AddIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    {u.containers?.map((container) => (
                                        <Paper
                                            key={container.id}
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                mb: 1,
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                border: '1px solid transparent',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    background: 'rgba(255,255,255,0.08)',
                                                    borderColor: 'rgba(103, 126, 234, 0.3)',
                                                    transform: 'translateX(4px)'
                                                }
                                            }}
                                            onClick={() => handleContainerSelect(container)}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight="600" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <StorageIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.8 }} />{container.id}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                                        <Chip
                                                            label={container.status}
                                                            size="small"
                                                            color={container.status === 'running' ? 'success' : container.status === 'error' ? 'error' : 'warning'}
                                                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500 }}
                                                        />
                                                        <Chip label={container.env_label?.value || '—'} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.1)' }} />
                                                    </Box>
                                                </Box>
                                                <Tooltip title="Открыть детали">
                                                    <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                                        <InfoIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.7rem', color: 'text.secondary' }}>
                                                <Box>CPU: {container.cpu_usage?.toFixed(1) || 0}%</Box>
                                                <Box>RAM: {container.memory_usage ? formatBytes(container.memory_usage) : '—'}</Box>
                                            </Box>
                                        </Paper>
                                    ))}
                                    {u.containers?.length === 0 && (
                                        <Box sx={{ textAlign: 'center', py: 2 }}>
                                            <StorageIcon sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                                                Нет активных контейнеров
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Collapse>
                        </React.Fragment>
                    ))}

                    {adminActiveTab === 0 && filteredUsers.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                            <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Пользователи не найдены
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Попробуйте изменить параметры поиска или фильтры
                            </Typography>
                            {(userSearchQuery || userFilterRole !== 'all' || userFilterStatus !== 'all') && (
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setUserSearchQuery('');
                                        setUserFilterRole('all');
                                        setUserFilterStatus('all');
                                    }}
                                    sx={{ mt: 2 }}
                                >
                                    Сбросить фильтры
                                </Button>
                            )}
                        </Box>
                    )}

                    {adminActiveTab === 1 && (
                        <Box sx={{ px: 1.5 }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreateGroupDialog}
                                fullWidth
                                sx={{ mb: 2, textTransform: 'none' }}
                            >
                                Создать группу
                            </Button>

                            {groupsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                            ) : userGroups.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Группы не созданы
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Создайте первую группу для организации пользователей
                                    </Typography>
                                </Box>
                            ) : (
                                userGroups.map((group) => (
                                    <Paper
                                        key={group.id}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            mb: 1.5,
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: 2,
                                            border: `2px solid ${group.color || '#ff9800'}40`,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                borderColor: `${group.color || '#ff9800'}80`,
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 4px 12px ${group.color || '#ff9800'}20`
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: group.color || '#ff9800' }} />
                                            <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>{group.id}</Typography>
                                            <IconButton size="small" onClick={() => handleOpenEditGroupDialog(group)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDeleteGroup(group.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        {group.description && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                {group.description}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                                            <Chip label={`${group.members?.length || 0} польз.`} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'primary.main/20' }} />
                                            <Chip label={`${group.containers?.length || 0} конт.`} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'success.main/20' }} />
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            fullWidth
                                            startIcon={<GroupIcon />}
                                            onClick={() => handleOpenMembersDialog(group)}
                                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                        >
                                            Участники
                                        </Button>
                                    </Paper>
                                ))
                            )}
                        </Box>
                    )}
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
                            <Card sx={{
                                bgcolor: 'rgba(18, 22, 40, 0.6)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 3,
                                height: '100%',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 12px 32px ${theme.palette[stat.color as keyof typeof theme.palette].toString}30`,
                                    borderColor: `${theme.palette[stat.color as keyof typeof theme.palette].toString}50`
                                }
                            }}>
                                <CardContent sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={500}>{stat.title}</Typography>
                                        <Box sx={{
                                            p: 1,
                                            borderRadius: 2,
                                            bgcolor: `${stat.color}.main/15`,
                                            color: `${stat.color}.main`
                                        }}>
                                            {React.cloneElement(stat.icon as React.ReactElement)}
                                        </Box>
                                    </Box>
                                    <Typography variant="h3" fontWeight="700" sx={{ lineHeight: 1.2 }}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{stat.sub}</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={stat.progress}
                                        sx={{
                                            mt: 1.5,
                                            height: 4,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            '& .MuiLinearProgress-bar': {
                                                borderRadius: 2,
                                                bgcolor: `${stat.color}.main`
                                            }
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h5" fontWeight={600}>Все контейнеры</Typography>
                        <Typography variant="body2" color="text.secondary">Управление и мониторинг контейнеров всех пользователей</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_, newMode) => newMode && setViewMode(newMode)}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}
                        >
                            <ToggleButton value="grid" sx={{ p: 0.5 }}>
                                <ViewModuleIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="list" sx={{ p: 0.5 }}>
                                <ViewListIcon fontSize="small" />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenCreateContainerDialog()}
                            sx={{ textTransform: 'none' }}
                        >
                            Создать контейнер
                        </Button>
                        <Chip label={totalContainers} size="medium" sx={{ fontWeight: 500, bgcolor: 'primary.main/20', color: 'primary.light' }} />
                        <Tooltip title="Обновить данные">
                            <IconButton
                                onClick={() => { refetchContainers(); refetchUsers(); refetchUserGroups(); }}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.08)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
                                }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{
                    display: 'flex',
                    flexWrap: viewMode === 'grid' ? 'wrap' : 'nowrap',
                    flexDirection: viewMode === 'list' ? 'column' : 'row',
                    gap: { xs: 2, md: 3 }
                }}>
                    {containers.map((container) => (
                        <Box key={container.id} sx={{
                            flex: viewMode === 'grid' ? {
                                xs: '1 1 100%',
                                sm: '1 1 calc(50% - 12px)',
                                md: '1 1 calc(33.333% - 16px)',
                                xl: '1 1 calc(25% - 18px)'
                            } : '0 0 auto',
                            minWidth: viewMode === 'grid' ? {
                                xs: '100%',
                                sm: 'calc(50% - 12px)',
                                md: 'calc(33.333% - 16px)',
                                xl: 'calc(25% - 18px)'
                            } : '100%',
                            maxWidth: viewMode === 'grid' ? {
                                xl: 'calc(25% - 18px)'
                            } : '100%'
                        }}>
                            <ContainerCard container={container} onSelect={handleContainerSelect} onAction={handleContainerAction} />
                        </Box>
                    ))}
                </Box>

                {containers.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 10 }}>
                        <Box sx={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 3,
                        }}>
                            <StorageIcon sx={{ fontSize: 50, color: 'text.secondary' }} />
                        </Box>
                        <Typography variant="h6" fontWeight={500} color="text.primary" gutterBottom>
                            Контейнеры не найдены
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: 2 }}>
                            Создайте первый контейнер или дождитесь, пока пользователи добавят свои
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCreateContainerDialog()}>
                            Создать контейнер
                        </Button>
                    </Box>
                )}
            </Box>

            <Dialog
                open={!!selectedContainer}
                onClose={handleCloseDetails}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        m: { xs: 1, md: 2 }
                    }
                }}
            >
                {selectedContainer && (
                    <>
                        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: selectedContainer.status === 'running' ? 'success.main/20' : 'warning.main/20',
                                    color: selectedContainer.status === 'running' ? 'success.main' : 'warning.main'
                                }}>
                                    <StorageIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>{selectedContainer.id}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Chip
                                            label={selectedContainer.status}
                                            size="small"
                                            color={selectedContainer.status === 'running' ? 'success' : selectedContainer.status === 'error' ? 'error' : 'warning'}
                                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 500 }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            Создан: {new Date(selectedContainer.created_at).toLocaleDateString('ru-RU')}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title={autoRefresh ? 'Автообновление включено' : 'Автообновление выключено'}>
                                    <IconButton
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                        size="small"
                                        sx={{
                                            color: autoRefresh ? 'success.main' : 'text.secondary',
                                            bgcolor: 'rgba(255,255,255,0.08)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
                                        }}
                                    >
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Обновить">
                                    <IconButton
                                        onClick={handleRefreshDetails}
                                        disabled={detailsLoading}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                    >
                                        {detailsLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                                    </IconButton>
                                </Tooltip>
                                <IconButton onClick={handleCloseDetails} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>

                        <DialogContent sx={{ pt: 3 }}>
                            <Tabs
                                value={activeTab}
                                onChange={(_, v) => setActiveTab(v)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{
                                    mb: 3,
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, minHeight: 40 },
                                    '& .Mui-selected': { color: 'primary.main !important' }
                                }}
                            >
                                <Tab icon={<TimelineIcon fontSize="small" />} iconPosition="start" label="Мониторинг" />
                                <Tab icon={<GroupIcon fontSize="small" />} iconPosition="start" label={`Группы (${containerDetails?.groups?.length || 0})`} />
                                <Tab icon={<FolderIcon fontSize="small" />} iconPosition="start" label="Файлы" />
                                <Tab icon={<LockIcon fontSize="small" />} iconPosition="start" label={`Доступы (${containerAccesses.length})`} />
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
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 2,
                                                        borderRadius: 2.5,
                                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        textAlign: 'center',
                                                        transition: 'all 0.3s',
                                                        '&:hover': {
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: `0 8px 24px ${metric.color}30`,
                                                            borderColor: `${metric.color}50`
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 1, color: metric.color }}>
                                                        {metric.icon}
                                                        <Typography variant="caption" fontWeight={500}>{metric.label}</Typography>
                                                    </Box>
                                                    <Typography variant="h4" fontWeight={700}>
                                                        {metric.format ? metric.format(metric.value) : formatPercent(metric.value)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">{metric.unit}</Typography>
                                                </Paper>
                                            </Box>
                                        ))}
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                        <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', lg: 'calc(50% - 12px)' } }}>
                                            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CpuIcon fontSize="small" sx={{ color: chartColors.cpu }} />
                                                    Загрузка CPU и памяти
                                                </Typography>
                                                <Box sx={{ height: 250 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={containerDetails?.history || []}>
                                                            <defs>
                                                                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={chartColors.cpu} stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor={chartColors.cpu} stopOpacity={0} />
                                                                </linearGradient>
                                                                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={chartColors.memory} stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor={chartColors.memory} stopOpacity={0} />
                                                                </linearGradient>
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
                                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <GpuIcon fontSize="small" sx={{ color: chartColors.gpu }} />
                                                    GPU и хранилище
                                                </Typography>
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
                                                        <Paper
                                                            elevation={0}
                                                            sx={{
                                                                p: 2.5,
                                                                borderRadius: 3,
                                                                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                                                                border: `2px solid ${group.color || '#ff9800'}40`,
                                                                transition: 'all 0.3s',
                                                                '&:hover': {
                                                                    borderColor: `${group.color || '#ff9800'}80`,
                                                                    transform: 'translateY(-2px)',
                                                                    boxShadow: `0 8px 24px ${group.color || '#ff9800'}20`
                                                                }
                                                            }}
                                                        >
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
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Размер</Typography>
                                                                    <Typography variant="body2" fontWeight={500}>{formatBytes(stats?.total_size || 0)}</Typography>
                                                                </Box>
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">Средний файл</Typography>
                                                                    <Typography variant="body2" fontWeight={500}>{formatBytes(stats?.average_file_size || 0)}</Typography>
                                                                </Box>
                                                            </Box>
                                                            {stats?.files && stats.files.length > 0 && (
                                                                <Box sx={{ height: 80 }}>
                                                                    <ResponsiveContainer width="100%" height="100%">
                                                                        <AreaChart data={stats.files.slice(0, 10).map((f, i) => ({ name: i, size: f.size }))}>
                                                                            <Area type="monotone" dataKey="size" stroke={group.color || '#ff9800'} fill={`${group.color || '#ff9800'}30`} strokeWidth={2} />
                                                                        </AreaChart>
                                                                    </ResponsiveContainer>
                                                                </Box>
                                                            )}
                                                        </Paper>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ) : (
                                        <Box sx={{ textAlign: 'center', py: 6 }}>
                                            <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                                            <Typography color="text.secondary">Группы не созданы</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                Создайте группы для организации файлов в этом контейнере
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {activeTab === 2 && selectedContainer && (
                                <Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
                                        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                                            <TextField
                                                size="small"
                                                placeholder="Поиск файлов..."
                                                value={fileSearchQuery}
                                                onChange={(e) => setFileSearchQuery(e.target.value)}
                                                InputProps={{
                                                    startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
                                                    sx: { bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }
                                                }}
                                                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                                            />
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                            <Select
                                                value={selectedFileGroup}
                                                onChange={(e) => setSelectedFileGroup(e.target.value)}
                                                displayEmpty
                                                sx={{ color: 'text.primary', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}
                                            >
                                                <MenuItem value="all">Все группы</MenuItem>
                                                {containerDetails?.groups?.map(group => (
                                                    <MenuItem key={group.id} value={group.id}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: group.color }} />
                                                            {group.id}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Tooltip title="Обновить список">
                                            <IconButton
                                                onClick={() => refetchFiles()}
                                                disabled={filesLoading}
                                                size="small"
                                                sx={{ bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                            >
                                                {filesLoading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                                            </IconButton>
                                        </Tooltip>
                                        <Chip label={`${filteredFiles.length} файлов`} size="small" sx={{ bgcolor: 'primary.main/20', color: 'primary.light' }} />
                                    </Box>

                                    {filesLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                                    ) : filteredFiles.length === 0 ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 4,
                                                borderRadius: 2,
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                border: '1px dashed rgba(255,255,255,0.1)',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                                            <Typography color="text.secondary">
                                                {fileSearchQuery || selectedFileGroup !== 'all' ? 'Файлы не найдены' : 'В контейнере нет файлов'}
                                            </Typography>
                                        </Paper>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 500, overflow: 'auto', pr: 1 }}>
                                            {filteredFiles.map((file) => {
                                                const fileGroups = containerDetails?.fileGroups?.[file.name] || [];
                                                return (
                                                    <Paper
                                                        key={file.name}
                                                        elevation={0}
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: 2,
                                                            bgcolor: 'rgba(255,255,255,0.03)',
                                                            border: '1px solid rgba(255,255,255,0.08)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            '&:hover': {
                                                                bgcolor: 'rgba(255,255,255,0.06)',
                                                                borderColor: 'rgba(103, 126, 234, 0.3)',
                                                                transform: 'translateX(4px)'
                                                            }
                                                        }}
                                                        onClick={() => handleFileClick(file)}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                                                            <Box sx={{
                                                                width: 40,
                                                                height: 40,
                                                                borderRadius: 2,
                                                                bgcolor: getFileColor(file.mime_type),
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontWeight: 600,
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                {getFileIcon(file.mime_type)}
                                                            </Box>
                                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                <Typography variant="body2" fontWeight={500} noWrap>{file.name}</Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                                                    <Typography variant="caption" color="text.secondary">{formatBytes(file.size)}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{file.mime_type}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {new Date(file.created_at).toLocaleDateString('ru-RU')}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                                                            {fileGroups.slice(0, 3).map(groupId => {
                                                                const group = containerDetails?.groups?.find(g => g.id === groupId);
                                                                return group ? (
                                                                    <Tooltip key={groupId} title={group.id}>
                                                                        <Box sx={{
                                                                            width: 14,
                                                                            height: 14,
                                                                            borderRadius: '50%',
                                                                            bgcolor: group.color,
                                                                            border: '2px solid rgba(0,0,0,0.3)'
                                                                        }} />
                                                                    </Tooltip>
                                                                ) : null;
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
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                        <Typography variant="h6" fontWeight={600}>Управление доступами</Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={handleOpenAccessDialog}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Предоставить доступ
                                        </Button>
                                    </Box>

                                    {containerAccesses.length === 0 ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 4,
                                                textAlign: 'center',
                                                bgcolor: 'rgba(255,255,255,0.03)',
                                                border: '1px dashed rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            <LockIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                                            <Typography color="text.secondary">Нет групп с доступом к этому контейнеру</Typography>
                                        </Paper>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {containerAccesses.map((access) => {
                                                const group = userGroups.find(g => g.id === access.group_id);
                                                return (
                                                    <Paper
                                                        key={access.group_id}
                                                        elevation={0}
                                                        sx={{
                                                            p: 2,
                                                            borderRadius: 2,
                                                            bgcolor: 'rgba(255,255,255,0.03)',
                                                            border: `2px solid ${group?.color || '#ff9800'}40`,
                                                            transition: 'all 0.2s',
                                                            '&:hover': {
                                                                borderColor: `${group?.color || '#ff9800'}80`,
                                                                transform: 'translateX(4px)'
                                                            }
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: group?.color || '#ff9800' }} />
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="subtitle2" fontWeight={600}>{access.group_id}</Typography>
                                                                {group?.description && (
                                                                    <Typography variant="caption" color="text.secondary">{group.description}</Typography>
                                                                )}
                                                            </Box>
                                                            <Chip
                                                                label={access.permission}
                                                                size="small"
                                                                color={access.permission === 'admin' ? 'error' : access.permission === 'read_write' ? 'success' : 'info'}
                                                                sx={{ fontSize: '0.7rem' }}
                                                            />
                                                            <Tooltip title="Отозвать доступ">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleRevokeAccess(access.group_id)}
                                                                    sx={{ color: 'error.main' }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                        {group && group.members && group.members.length > 0 && (
                                                            <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                                {group.members.slice(0, 5).map(m => (
                                                                    <Chip
                                                                        key={m.user_id}
                                                                        label={m.user_name}
                                                                        size="small"
                                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                                    />
                                                                ))}
                                                                {group.members.length > 5 && (
                                                                    <Chip
                                                                        label={`+${group.members.length - 5}`}
                                                                        size="small"
                                                                        sx={{ height: 22, fontSize: '0.7rem' }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        )}
                                                    </Paper>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {activeTab === 4 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>📋 Конфигурация</Typography>
                                            <Stack spacing={1.5}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">ID контейнера</Typography>
                                                    <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                        {selectedContainer.id}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Пользователь</Typography>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {users.find(u => u.id === selectedContainer.user_id)?.name || selectedContainer.user_id}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Окружение</Typography>
                                                    <Chip label={selectedContainer.env_label?.value || '—'} size="small" sx={{ height: 22, fontSize: '0.7rem' }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Тип</Typography>
                                                    <Chip
                                                        label={selectedContainer.type_label?.value || '—'}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ height: 22, fontSize: '0.7rem', borderColor: 'rgba(255,255,255,0.2)' }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Создан</Typography>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {new Date(selectedContainer.created_at).toLocaleString('ru-RU')}
                                                    </Typography>
                                                </Box>
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
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                            <Typography variant="body2" color="text.secondary">{limit.label}</Typography>
                                                            <Typography variant="body2" fontWeight={500}>{limit.value}</Typography>
                                                        </Box>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={Math.min(100, limit.progress)}
                                                            sx={{
                                                                height: 6,
                                                                borderRadius: 3,
                                                                bgcolor: 'rgba(255,255,255,0.1)',
                                                                '& .MuiLinearProgress-bar': {
                                                                    borderRadius: 3,
                                                                    bgcolor: `${limit.color}.main`
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Box>
                                    <Box sx={{ width: '100%' }}>
                                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>🔐 Права доступа</Typography>
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip
                                                    icon={<StorageIcon fontSize="small" />}
                                                    label={selectedContainer.privileged ? 'Privileged mode' : 'Standard mode'}
                                                    color={selectedContainer.privileged ? 'error' : 'success'}
                                                    size="small"
                                                    sx={{ fontWeight: 500 }}
                                                />
                                                {selectedContainer.commands?.map((cmd, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={`cmd: ${cmd}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ borderColor: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}
                                                    />
                                                ))}
                                            </Box>
                                        </Paper>
                                    </Box>
                                </Box>
                            )}
                        </DialogContent>

                        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <Button onClick={handleCloseDetails} variant="outlined" color="inherit">Закрыть</Button>
                            <Box sx={{ flexGrow: 1 }} />
                            {selectedContainer.status === 'running' && (
                                <>
                                    <Button variant="outlined" color="warning" onClick={() => handleContainerAction('stop', selectedContainer)}>
                                        Остановить
                                    </Button>
                                    <Button variant="outlined" onClick={() => handleContainerAction('restart', selectedContainer)} sx={{ ml: 1 }}>
                                        Перезапустить
                                    </Button>
                                </>
                            )}
                            <Button variant="contained" color="error" onClick={() => handleContainerAction('delete', selectedContainer)} sx={{ ml: 1 }}>
                                Удалить
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Dialog
                open={roleEditDialogOpen}
                onClose={() => setRoleEditDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>Изменить роль</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {editingUser && (
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Пользователь: <strong>{editingUser.name}</strong> ({editingUser.email})
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Текущая роль: <Chip label={editingUser.role} size="small" sx={{ fontWeight: 500 }} />
                            </Typography>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Новая роль</InputLabel>
                                <Select value={newRole} onChange={(e) => setNewRole(e.target.value)} label="Новая роль">
                                    {AVAILABLE_ROLES.map(role => (
                                        <MenuItem key={role} value={role}>{role}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
                    <Button onClick={() => setRoleEditDialogOpen(false)} color="inherit">Отмена</Button>
                    <Button onClick={handleSaveRole} variant="contained" disabled={updateRoleMutation.isPending}>
                        {updateRoleMutation.isPending ? <CircularProgress size={20} /> : 'Сохранить'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={groupDialogOpen}
                onClose={() => setGroupDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            {editingGroup ? 'Редактировать группу' : 'Создать группу'}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Название группы"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            fullWidth
                            disabled={!!editingGroup}
                            helperText={editingGroup ? 'Название группы изменить нельзя' : 'Уникальный идентификатор группы'}
                        />
                        <TextField
                            label="Описание"
                            value={newGroupDescription}
                            onChange={(e) => setNewGroupDescription(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Цвет группы</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {GROUP_COLORS.map(color => (
                                    <Box
                                        key={color}
                                        onClick={() => setNewGroupColor(color)}
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1,
                                            bgcolor: color,
                                            cursor: 'pointer',
                                            border: newGroupColor === color ? '3px solid white' : '3px solid transparent',
                                            transition: 'all 0.2s',
                                            '&:hover': { transform: 'scale(1.1)' },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
                    <Button onClick={() => setGroupDialogOpen(false)} color="inherit">Отмена</Button>
                    <Button
                        onClick={handleSaveGroup}
                        variant="contained"
                        disabled={createGroupMutation.isPending || updateGroupMutation.isPending || !newGroupName.trim()}
                    >
                        {(createGroupMutation.isPending || updateGroupMutation.isPending) ? <CircularProgress size={20} /> : (editingGroup ? 'Сохранить' : 'Создать')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={membersDialogOpen}
                onClose={() => setMembersDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon color="primary" />
                        <Box>
                            <Typography variant="h6" fontWeight={600}>Участники группы</Typography>
                            {selectedGroup && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: selectedGroup.color }} />
                                    <Typography variant="body2" color="text.secondary">{selectedGroup.id}</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Добавить участника</Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                            <FormControl fullWidth>
                                <InputLabel>Пользователь</InputLabel>
                                <Select
                                    value={addMemberUserId}
                                    onChange={(e) => setAddMemberUserId(e.target.value)}
                                    label="Пользователь"
                                >
                                    <MenuItem value="">
                                        <em>Выберите пользователя</em>
                                    </MenuItem>
                                    {users.map(u => {
                                        const isMember = selectedGroupMembers.some(m => m.user_id === u.id);
                                        return (
                                            <MenuItem key={u.id} value={u.id} disabled={isMember}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                                        {u.name?.[0]?.toUpperCase()}
                                                    </Avatar>
                                                    <Typography variant="body2">{u.name}</Typography>
                                                    {isMember && <Chip label="уже участник" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />}
                                                </Box>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel>Роль</InputLabel>
                                <Select
                                    value={addMemberRole}
                                    onChange={(e) => setAddMemberRole(e.target.value)}
                                    label="Роль"
                                >
                                    <MenuItem value="member">Участник</MenuItem>
                                    <MenuItem value="moderator">Модератор</MenuItem>
                                    <MenuItem value="admin">Администратор</MenuItem>
                                </Select>
                            </FormControl>
                            <Button
                                variant="contained"
                                onClick={handleAddMember}
                                disabled={!addMemberUserId || addMemberMutation.isPending}
                                sx={{ textTransform: 'none', height: 56 }}
                            >
                                {addMemberMutation.isPending ? <CircularProgress size={20} /> : 'Добавить'}
                            </Button>
                        </Box>
                    </Paper>

                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                        Текущие участники ({selectedGroupMembers.length})
                    </Typography>

                    {selectedGroupMembers.length === 0 ? (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px dashed rgba(255,255,255,0.1)'
                            }}
                        >
                            <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                            <Typography color="text.secondary">В группе пока нет участников</Typography>
                        </Paper>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflow: 'auto' }}>
                            {selectedGroupMembers.map((member) => (
                                <Paper
                                    key={member.user_id}
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.06)',
                                            borderColor: 'rgba(103, 126, 234, 0.3)'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                                            {member.user_name?.[0]?.toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight={600}>{member.user_name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{member.user_email}</Typography>
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 130 }}>
                                            <Select
                                                value={member.role}
                                                onChange={(e) => handleChangeMemberRole(member.user_id, e.target.value)}
                                                disabled={updateMemberRoleMutation.isPending}
                                                sx={{ fontSize: '0.8rem' }}
                                            >
                                                <MenuItem value="member">Участник</MenuItem>
                                                <MenuItem value="moderator">Модератор</MenuItem>
                                                <MenuItem value="admin">Администратор</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Tooltip title="Удалить из группы">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                disabled={removeMemberMutation.isPending}
                                                sx={{ color: 'error.main' }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
                    <Button onClick={() => setMembersDialogOpen(false)} color="inherit">Закрыть</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={accessDialogOpen}
                onClose={() => setAccessDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>Предоставить доступ</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5}>
                        <FormControl fullWidth>
                            <InputLabel>Группа</InputLabel>
                            <Select
                                value={accessGroupId}
                                onChange={(e) => setAccessGroupId(e.target.value)}
                                label="Группа"
                            >
                                <MenuItem value="">
                                    <em>Выберите группу</em>
                                </MenuItem>
                                {userGroups.map(g => {
                                    const hasAccess = containerAccesses.some(a => a.group_id === g.id);
                                    return (
                                        <MenuItem key={g.id} value={g.id} disabled={hasAccess}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: g.color }} />
                                                <Typography variant="body2">{g.id}</Typography>
                                                {hasAccess && <Chip label="есть доступ" size="small" sx={{ height: 18, fontSize: '0.65rem', ml: 1 }} />}
                                            </Box>
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Уровень доступа</InputLabel>
                            <Select
                                value={accessPermission}
                                onChange={(e) => setAccessPermission(e.target.value)}
                                label="Уровень доступа"
                            >
                                {AVAILABLE_PERMISSIONS.map(perm => (
                                    <MenuItem key={perm} value={perm}>{perm}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
                    <Button onClick={() => setAccessDialogOpen(false)} color="inherit">Отмена</Button>
                    <Button
                        onClick={handleGrantAccess}
                        variant="contained"
                        disabled={!accessGroupId || grantAccessMutation.isPending}
                    >
                        {grantAccessMutation.isPending ? <CircularProgress size={20} /> : 'Предоставить'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={createContainerDialogOpen}
                onClose={() => setCreateContainerDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudUploadIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>Создать контейнер</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Stack spacing={2.5}>
                        <FormControl fullWidth>
                            <InputLabel>Владелец</InputLabel>
                            <Select
                                value={newContainerUserId}
                                onChange={(e) => setNewContainerUserId(e.target.value)}
                                label="Владелец"
                            >
                                {users.map(u => (
                                    <MenuItem key={u.id} value={u.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                                {u.name?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Typography variant="body2">{u.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">({u.email})</Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="ID контейнера"
                            value={newContainerId}
                            onChange={(e) => setNewContainerId(e.target.value)}
                            fullWidth
                            required
                            helperText="Уникальный идентификатор контейнера (латиница, цифры, дефисы)"
                        />

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Память (MB)"
                                type="number"
                                value={newContainerMemory}
                                onChange={(e) => setNewContainerMemory(parseInt(e.target.value) || 0)}
                                fullWidth
                                inputProps={{ min: 128, max: 65536 }}
                            />
                            <TextField
                                label="Хранилище (MB)"
                                type="number"
                                value={newContainerStorage}
                                onChange={(e) => setNewContainerStorage(parseInt(e.target.value) || 0)}
                                fullWidth
                                inputProps={{ min: 128, max: 1048576 }}
                            />
                        </Box>

                        <TextField
                            label="Лимит файлов"
                            type="number"
                            value={newContainerFileLimit}
                            onChange={(e) => setNewContainerFileLimit(parseInt(e.target.value) || 0)}
                            fullWidth
                            inputProps={{ min: 0, max: 1000000 }}
                        />

                        <TextField
                            label="Команды (каждая с новой строки)"
                            value={newContainerCommands}
                            onChange={(e) => setNewContainerCommands(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            helperText="Опционально: команды, доступные в контейнере"
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newContainerPrivileged}
                                    onChange={(e) => setNewContainerPrivileged(e.target.checked)}
                                    color="error"
                                />
                            }
                            label="Privileged mode (расширенные права)"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 2 }}>
                    <Button onClick={() => setCreateContainerDialogOpen(false)} color="inherit">Отмена</Button>
                    <Button
                        onClick={handleCreateContainerAsAdmin}
                        variant="contained"
                        disabled={createContainerAsAdminMutation.isPending || !newContainerUserId || !newContainerId.trim()}
                    >
                        {createContainerAsAdminMutation.isPending ? <CircularProgress size={20} /> : 'Создать'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(18, 22, 40, 0.98)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {confirmDialog.severity === 'error' && <ErrorIcon color="error" />}
                    {confirmDialog.severity === 'warning' && <WarningIcon color="warning" />}
                    {confirmDialog.severity === 'info' && <InfoIcon color="info" />}
                    <Typography variant="h6" fontWeight={600}>{confirmDialog.title}</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        {confirmDialog.message}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} color="inherit">
                        Отмена
                    </Button>
                    <Button
                        onClick={() => {
                            confirmDialog.onConfirm();
                            setConfirmDialog(prev => ({ ...prev, open: false }));
                        }}
                        variant="contained"
                        color={confirmDialog.severity === 'error' ? 'error' : confirmDialog.severity === 'warning' ? 'warning' : 'primary'}
                    >
                        Подтвердить
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                    icon={
                        snackbar.severity === 'success' && <CheckCircleIcon /> ||
                        snackbar.severity === 'error' && <ErrorIcon /> ||
                        snackbar.severity === 'warning' && <WarningIcon /> ||
                        <InfoIcon />
                    }
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};