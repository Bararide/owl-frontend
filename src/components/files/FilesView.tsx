import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Fade,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  Paper,
  Menu,
  MenuItem,
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Button,
  Badge,
  Slide,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  SmartToy as SemanticSearchIcon,
  Tune as TuneIcon,
  AutoAwesome as AutoAwesomeIcon,
  InsertDriveFile as FileIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Clear as ClearIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  TextFields as TextFieldsIcon,
  OpenInNew as OpenInNewIcon,
  Hub as HubIcon,
  ShowChart as ShowChartIcon,
  Timeline as TimelineIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterFocusStrongIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';

import { apiClient } from '../../api/client';
import type { 
  ApiFile, 
  SearchResultFile,
  FileContent,
  SemanticGraphData,
  RecommendationFile
} from '../../api/client';
import { 
  useDeleteFile, 
  useFileContent, 
  useFiles, 
  useGetSemanticGraph, 
  useRecommendationsStream, 
  useSemanticSearch, 
  useUploadFile,
  useNotifications
} from '../../hooks/useApi';

type Severity = 'success' | 'error' | 'info' | 'warning';

const MIME_TO_LANGUAGE: Record<string, string> = {
  'text/javascript': 'JavaScript',
  'application/json': 'JSON',
  'text/html': 'HTML',
  'text/css': 'CSS',
  'text/x-python': 'Python',
  'text/x-java': 'Java',
  'text/x-c++': 'C++',
  'text/x-c': 'C',
  'text/x-ruby': 'Ruby',
  'text/x-php': 'PHP',
  'text/x-go': 'Go',
  'text/x-rust': 'Rust',
  'text/x-typescript': 'TypeScript',
  'text/x-yaml': 'YAML',
  'text/x-markdown': 'Markdown',
  'text/plain': 'Text',
};

const HIGHLIGHT_COLORS = [
  'rgba(255, 235, 59, 0.3)',
  'rgba(76, 175, 80, 0.3)',
  'rgba(33, 150, 243, 0.3)',
  'rgba(156, 39, 176, 0.3)',
  'rgba(255, 87, 34, 0.3)',
  'rgba(233, 30, 99, 0.3)',
  'rgba(0, 188, 212, 0.3)',
  'rgba(139, 195, 74, 0.3)',
];

interface SearchMatch {
  word: string;
  positions: number[];
  color: string;
}

interface FileContentDialogProps {
  open: boolean;
  onClose: () => void;
  file: ApiFile | null;
  containerId: string;
  allFiles: ApiFile[];
  onFileUpdated?: () => void;
  onFileDeleted?: () => void;
  searchQuery?: string;
  currentFileIndex?: number;
  totalFiles?: number;
  onNextFile?: () => void;
  onPrevFile?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const getLanguageFromMimeType = (mimeType: string): string => MIME_TO_LANGUAGE[mimeType] || 'Text';

// Панель с AI объяснением
const ExplanationPanel: React.FC<{
  explanation: string;
  query?: string;
}> = ({ explanation, query }) => {
  return (
    <Paper elevation={0} sx={{
      width: { xs: '100%', lg: 360 },
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(0,0,0,0.32)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        borderBottom: '1px solid rgba(255,255,255,0.08)', 
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.05) 100%)'
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PsychologyIcon sx={{ fontSize: 18, color: '#ff9800' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ff9800' }}>
            AI Explanation
          </Typography>
        </Stack>
        {query && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            For query: "{query.length > 50 ? query.slice(0, 50) + '...' : query}"
          </Typography>
        )}
      </Box>
      <Box sx={{ 
        flex: 1, 
        minHeight: 0, 
        overflow: 'auto', 
        p: 2,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.05)', borderRadius: 3 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,152,0,0.3)', borderRadius: 3 },
      }}>
        {!explanation ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            textAlign: 'center',
            opacity: 0.7
          }}>
            <AutoAwesomeIcon sx={{ fontSize: 48, color: 'rgba(255,152,0,0.3)', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              No AI explanation available
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Perform a semantic search to generate explanations for relevant files
            </Typography>
          </Box>
        ) : (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255,255,255,0.92)', 
              lineHeight: 1.7,
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {explanation}
          </Typography>
        )}
      </Box>
      {explanation && (
        <Box sx={{ 
          p: 1.5, 
          borderTop: '1px solid rgba(255,255,255,0.08)', 
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}>
          <Chip 
            icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
            label="Generated by AI"
            size="small"
            sx={{ 
              backgroundColor: 'rgba(255, 152, 0, 0.1)', 
              color: '#ff9800',
              border: '1px solid rgba(255, 152, 0, 0.2)'
            }}
          />
        </Box>
      )}
    </Paper>
  );
};

const normalizeGraph = (
  files: ApiFile[],
  graphData: SemanticGraphData | undefined
) => {
  const fileMap = new Map<string, ApiFile>();
  files.forEach((f) => {
    fileMap.set(f.path, f);
    fileMap.set(f.name, f);
  });

  let rawEdges: any[] = [];
  let rawNodes: any[] = [];
  
  if (graphData) {
    if (Array.isArray((graphData as any).graph)) {
      rawEdges = (graphData as any).graph;
    }
    else if (graphData.edges || graphData.links) {
      rawEdges = graphData.edges || graphData.links || [];
      rawNodes = graphData.nodes || [];
    }
    else if (Array.isArray(graphData)) {
      rawEdges = graphData;
    }
  }

  if (rawNodes.length === 0 && rawEdges.length > 0) {
    const uniqueNodes = new Set<string>();
    rawEdges.forEach((edge: any) => {
      const source = edge.source || edge.from;
      const target = edge.target || edge.to;
      if (source) uniqueNodes.add(source);
      if (target) uniqueNodes.add(target);
    });
    
    rawNodes = Array.from(uniqueNodes).map(id => ({
      id,
      path: id,
      name: id.split('/').pop() || id,
    }));
  }

  const nodeIdToPath = new Map<string, string>();
  const nodePaths = new Set<string>();

  rawNodes.forEach((node: any) => {
    const path = node.path || node.name || node.title || node.id || '';
    const id = node.id || path;
    if (path) {
      nodeIdToPath.set(id, path);
      nodePaths.add(path);
    }
  });

  files.forEach((file) => {
    nodePaths.add(file.path);
    nodeIdToPath.set(file.path, file.path);
  });

  const normalizedEdges = rawEdges
    .map((edge: any) => {
      const rawSource = edge.source || edge.from;
      const rawTarget = edge.target || edge.to;
      
      if (!rawSource || !rawTarget) return null;
      
      const source = nodeIdToPath.get(rawSource) || rawSource;
      const target = nodeIdToPath.get(rawTarget) || rawTarget;
      
      if (!source || !target) return null;
      
      return {
        source,
        target,
        weight: edge.scope || edge.weight || 1,
        bidirectional: edge.bidirectional === true || edge.reverse === true,
      };
    })
    .filter(Boolean) as Array<{
      source: string;
      target: string;
      weight: number;
      bidirectional: boolean;
    }>;

  const degreeMap = new Map<string, number>();
  nodePaths.forEach((p) => degreeMap.set(p, 0));
  normalizedEdges.forEach((edge) => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  });

  const nodes = Array.from(nodePaths).map((path) => {
    const file = fileMap.get(path);
    const degree = degreeMap.get(path) || 0;
    return {
      id: path,
      path,
      name: file?.name || path.split('/').pop() || path,
      file: file || null,
      degree,
      radius: 10 + Math.min(28, degree * 2.2),
    };
  });

  return { nodes, edges: normalizedEdges };
};

const FileContentDialog: React.FC<FileContentDialogProps> = ({
  open, onClose, file, containerId, allFiles, onFileUpdated, onFileDeleted,
  searchQuery: initialSearchQuery = '', currentFileIndex = 0, totalFiles = 0, onNextFile, onPrevFile,
}) => {
  const { data, isLoading, error, refetch } = useFileContent(containerId, file?.name || '');
  const deleteFileMutation = useDeleteFile();
  const uploadFileMutation = useUploadFile();
  const { addNotification } = useNotifications();

  const content = data?.content || '';
  const explanation = data?.explanation || '';

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saveError, setSaveError] = useState('');
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const isTextFile = file?.mime_type?.startsWith('text/') || file?.mime_type === 'application/json';
  const parseSearchQuery = useMemo(() => searchQuery.trim().split(/\s+/).filter(Boolean), [searchQuery]);

  const findSearchMatches = useMemo(() => {
    if (!searchQuery.trim() || !editedContent || parseSearchQuery.length === 0) return [];
    const matches: SearchMatch[] = [];
    const content = matchCase ? editedContent : editedContent.toLowerCase();

    parseSearchQuery.forEach((word, wordIndex) => {
      const searchTerm = matchCase ? word : word.toLowerCase();
      const positions: number[] = [];
      if (wholeWord) {
        const regex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, matchCase ? 'g' : 'gi');
        let match;
        while ((match = regex.exec(editedContent)) !== null) positions.push(match.index);
      } else {
        let position = content.indexOf(searchTerm);
        while (position !== -1) { positions.push(position); position = content.indexOf(searchTerm, position + 1); }
      }
      if (positions.length > 0) {
        matches.push({ word, positions, color: HIGHLIGHT_COLORS[wordIndex % HIGHLIGHT_COLORS.length] });
      }
    });
    return matches;
  }, [editedContent, searchQuery, parseSearchQuery, matchCase, wholeWord]);

  const totalMatches = useMemo(() => searchMatches.reduce((sum, m) => sum + m.positions.length, 0), [searchMatches]);

  useEffect(() => {
    if (file?.name && open) {
      setIsEditing(false); setEditedContent(''); setSaveError(''); setActionMenuAnchor(null);
      setShowDeleteConfirm(false); setSearchQuery(initialSearchQuery); setSearchMatches([]);
      setCurrentMatchIndex(-1); setIsSearchActive(!!initialSearchQuery); setCopied(false);
      setMatchCase(false); setWholeWord(false);
      setTimeout(() => refetch(), 100);
    }
  }, [file?.name, initialSearchQuery, open, refetch]);

  useEffect(() => { if (data?.content && !editedContent) setEditedContent(data.content); }, [data, editedContent]);
  useEffect(() => {
    if (!open) {
      setIsEditing(false); setEditedContent(''); setSaveError(''); setActionMenuAnchor(null);
      setShowDeleteConfirm(false); setSearchQuery(''); setSearchMatches([]); setCurrentMatchIndex(-1);
      setIsSearchActive(false); setCopied(false); setMatchCase(false); setWholeWord(false);
    }
  }, [open]);
  useEffect(() => {
    const matches = findSearchMatches;
    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 && matches[0].positions.length > 0 ? 0 : -1);
  }, [findSearchMatches]);

  const flattenRanges = useMemo(() => {
    const ranges: Array<{ start: number; end: number; color: string; word: string; isCurrent: boolean; }> = [];
    searchMatches.forEach((match) => {
      match.positions.forEach((pos) => {
        ranges.push({ start: pos, end: pos + match.word.length, color: match.color, word: match.word, isCurrent: false });
      });
    });
    ranges.sort((a, b) => a.start - b.start);
    if (currentMatchIndex >= 0 && currentMatchIndex < ranges.length) ranges[currentMatchIndex].isCurrent = true;
    return ranges;
  }, [searchMatches, currentMatchIndex]);

  useEffect(() => {
    if (currentMatchIndex < 0 || !contentScrollRef.current) return;
    const marks = contentScrollRef.current.querySelectorAll('[data-current-match="true"]');
    const current = marks[0] as HTMLElement | undefined;
    if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchIndex, flattenRanges]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); setIsSearchActive(!!e.target.value.trim()); };
  const handleClearSearch = () => { setSearchQuery(''); setSearchMatches([]); setCurrentMatchIndex(-1); setIsSearchActive(false); };
  const handleNextMatch = () => { if (totalMatches === 0) return; setCurrentMatchIndex((prev) => { const next = prev + 1; return next >= totalMatches ? 0 : next; }); };
  const handlePrevMatch = () => { if (totalMatches === 0) return; setCurrentMatchIndex((prev) => { const next = prev - 1; return next < 0 ? totalMatches - 1 : next; }); };

  const handleCopyContent = useCallback(async () => {
    if (!editedContent) return;
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification({ message: 'Content copied to clipboard', severity: 'success', open: true });
    } catch {
      addNotification({ message: 'Failed to copy content', severity: 'error', open: true });
    }
  }, [editedContent, addNotification]);

  const handleEditToggle = () => { setIsEditing((prev) => !prev); setSaveError(''); };

  const handleSave = useCallback(async () => {
    if (!file || !containerId) return;
    setSaveError('');
    try {
      const blob = new Blob([editedContent], { type: file.mime_type || 'text/plain' });
      const newFile = new File([blob], file.name, { type: file.mime_type || 'text/plain', lastModified: Date.now() });
      await deleteFileMutation.mutateAsync({ fileId: file.name, containerId });
      await uploadFileMutation.mutateAsync({ containerId, file: newFile });
      addNotification({ message: `File "${file.name}" updated successfully`, severity: 'success', open: true });
      setIsEditing(false); onFileUpdated?.(); onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      setSaveError(errorMessage);
      addNotification({ message: errorMessage, severity: 'error', open: true });
    }
  }, [file, containerId, editedContent, deleteFileMutation, uploadFileMutation, addNotification, onFileUpdated, onClose]);

  const handleDelete = useCallback(async () => {
    if (!file || !containerId) return;
    try {
      await deleteFileMutation.mutateAsync({ fileId: file.name, containerId });
      addNotification({ message: `File "${file.name}" deleted successfully`, severity: 'success', open: true });
      onClose(); onFileDeleted?.();
    } catch (error) {
      addNotification({ message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error', open: true });
    }
  }, [file, containerId, deleteFileMutation, addNotification, onClose, onFileDeleted]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      const blob = await apiClient.downloadFile(file.name, containerId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
      addNotification({ message: `File "${file.name}" downloaded`, severity: 'success', open: true });
    } catch (error) {
      addNotification({ message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error', open: true });
    }
  }, [file, containerId, addNotification]);

  const renderTextWithHighlights = () => {
    if (!editedContent) return null;
    if (flattenRanges.length === 0) return editedContent;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    flattenRanges.forEach((range, index) => {
      if (range.start > lastIndex) {
        parts.push(<span key={`text-${index}`}>{editedContent.slice(lastIndex, range.start)}</span>);
      }
      parts.push(
        <mark 
          key={`highlight-${index}`}
          data-current-match={range.isCurrent ? 'true' : 'false'} 
          style={{
            backgroundColor: range.color, 
            color: 'inherit', 
            padding: '0 2px', 
            borderRadius: '3px',
            fontWeight: range.isCurrent ? 'bold' : 'normal',
            border: range.isCurrent ? '2px solid #ff9800' : 'none',
            boxShadow: range.isCurrent ? '0 0 8px rgba(255, 152, 0, 0.5)' : 'none', 
            transition: 'all 0.2s ease',
          }}
        >
          {editedContent.slice(range.start, range.end)}
        </mark>
      );
      lastIndex = range.end;
    });

    if (lastIndex < editedContent.length) {
      parts.push(<span key="text-last">{editedContent.slice(lastIndex)}</span>);
    }
    return parts;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && isEditing) { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape' && isEditing) { e.preventDefault(); setIsEditing(false); setEditedContent(data?.content || ''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isEditing, handleSave, data]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth PaperProps={{ sx: {
        borderRadius: 3, background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.98) 0%, rgba(26, 31, 54, 0.95) 100%)',
        backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
        width: '96vw', height: '92vh', maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}}>
        <DialogContent sx={{ p: 0, flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          {/* Левая панель с информацией о файле */}
          <Paper elevation={0} sx={{ width: 260, minWidth: 260, maxWidth: 260, borderRight: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{file?.name || file?.path.split('/').pop()}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{file?.path}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={getLanguageFromMimeType(file?.mime_type || '')} size="small" color="primary" />
                  <Chip label={formatFileSize(file?.size || 0)} size="small" variant="outlined" />
                </Stack>
                {totalFiles > 1 && <Typography variant="caption" color="text.secondary">File {currentFileIndex + 1} of {totalFiles}</Typography>}
              </Stack>
            </Box>
            <Box sx={{ p: 2, overflow: 'auto' }}>
              <Stack spacing={1.2}>
                {totalFiles > 1 && (
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="outlined" size="small" startIcon={<ChevronLeftIcon />} onClick={onPrevFile}>Prev</Button>
                    <Button fullWidth variant="outlined" size="small" endIcon={<ChevronRightIcon />} onClick={onNextFile}>Next</Button>
                  </Stack>
                )}
                {isTextFile && (
                  <>
                    <Button fullWidth variant={copied ? 'contained' : 'outlined'} size="small" startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />} onClick={handleCopyContent} color={copied ? 'success' : 'primary'}>{copied ? 'Copied' : 'Copy'}</Button>
                    <Button fullWidth variant={isEditing ? 'contained' : 'outlined'} size="small" startIcon={<EditIcon />} color={isEditing ? 'warning' : 'primary'} onClick={handleEditToggle}>{isEditing ? 'Cancel Edit' : 'Edit'}</Button>
                  </>
                )}
                <Button fullWidth variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleDownload}>Download</Button>
                <Button fullWidth variant="outlined" size="small" startIcon={<DeleteIcon />} color="error" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
                <Button fullWidth variant="outlined" size="small" startIcon={<MoreVertIcon />} onClick={(e) => setActionMenuAnchor(e.currentTarget)}>More</Button>
                <Divider sx={{ my: 1 }} />
                {isSearchActive && searchMatches.length > 0 && <Chip icon={<SearchIcon />} label={`${totalMatches} matches`} size="small" color="secondary" variant="outlined" />}
                {isEditing && <Alert severity="warning" sx={{ mt: 1 }}>Ctrl/Cmd + S to save</Alert>}
                {saveError && <Alert severity="error" onClose={() => setSaveError('')}>{saveError}</Alert>}
              </Stack>
            </Box>
          </Paper>

          {/* Центральная панель с контентом */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: { xs: 'none', lg: '1px solid rgba(255,255,255,0.08)' }, overflow: 'hidden' }}>
              {isTextFile && !isEditing && (
                <Paper elevation={0} sx={{ mx: 2, mt: 2, mb: 1, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                  <Stack sx={{ p: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TextField fullWidth variant="standard" placeholder="Search within file..." value={searchQuery} onChange={handleSearchChange} InputProps={{ disableUnderline: true, startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ opacity: 0.7, mr: 1 }} /></InputAdornment>, sx: { fontSize: '0.875rem', '& input::placeholder': { color: 'text.secondary', opacity: 0.7 } } }} size="small" />
                      {searchQuery && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                          <Badge badgeContent={parseSearchQuery.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}><TextFieldsIcon fontSize="small" sx={{ opacity: 0.7 }} /></Badge>
                          <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.8 }}>{totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : 'No matches'}</Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Previous match"><span><IconButton size="small" onClick={handlePrevMatch} disabled={totalMatches === 0}><NavigateBeforeIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Next match"><span><IconButton size="small" onClick={handleNextMatch} disabled={totalMatches === 0}><NavigateNextIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Clear search"><IconButton size="small" onClick={handleClearSearch}><ClearIcon fontSize="small" /></IconButton></Tooltip>
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                    {searchQuery && (
                      <Fade in={!!searchQuery}>
                        <Stack direction="row" spacing={2} sx={{ mt: 1, ml: 4 }}>
                          <FormControlLabel control={<Switch size="small" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />} label={<Typography variant="caption">Match case</Typography>} />
                          <FormControlLabel control={<Switch size="small" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />} label={<Typography variant="caption">Whole word</Typography>} />
                        </Stack>
                      </Fade>
                    )}
                  </Stack>
                </Paper>
              )}
              <Box sx={{ flex: 1, minHeight: 0, p: 2, pt: isTextFile && !isEditing ? 0 : 2, overflow: 'hidden' }}>
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Stack alignItems="center" spacing={2}><CircularProgress /><Typography variant="body2" color="text.secondary">Loading file content...</Typography></Stack></Box>
                ) : error ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center', p: 4 }}>
                    <CodeIcon sx={{ fontSize: 96, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>Unable to Load File</Typography>
                    <Typography variant="body1" sx={{ maxWidth: 400 }}>{error instanceof Error ? error.message : 'An unknown error occurred while loading the file'}</Typography>
                  </Box>
                ) : !isTextFile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center', p: 4 }}>
                    <DescriptionIcon sx={{ fontSize: 96, mb: 3, opacity: 0.3 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>Binary File Preview</Typography>
                    <Typography variant="body1" sx={{ mb: 3, maxWidth: 400 }}>This file type cannot be displayed in the text viewer. Download the file to view its contents with an appropriate application.</Typography>
                    <Button variant="contained" size="large" startIcon={<DownloadIcon />} onClick={handleDownload}>Download File</Button>
                  </Box>
                ) : data && editedContent !== undefined ? (
                  <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', flexShrink: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={getLanguageFromMimeType(file?.mime_type || '')} size="small" color="primary" />
                          {explanation && (
                            <Chip 
                              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                              label="AI Explained" 
                              size="small" 
                              sx={{ 
                                backgroundColor: 'rgba(255, 152, 0, 0.15)', 
                                color: '#ff9800',
                                border: '1px solid rgba(255, 152, 0, 0.3)'
                              }} 
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{data.encoding} • {formatFileSize(data.size)} • {editedContent.split('\n').length} lines</Typography>
                      </Stack>
                    </Box>
                    {isEditing ? (
                      <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
                        <TextField value={editedContent} onChange={(e) => setEditedContent(e.target.value)} multiline fullWidth sx={{ height: '100%', '& .MuiOutlinedInput-root': { height: '100%', alignItems: 'flex-start', borderRadius: 2 }, '& .MuiOutlinedInput-input': { fontFamily: '"Fira Code", monospace', fontSize: '0.875rem', lineHeight: 1.6, p: 3, height: '100% !important', overflow: 'auto !important' } }} InputProps={{ style: { height: '100%' } }} />
                      </Box>
                    ) : (
                      <Box ref={contentScrollRef} sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 3, fontFamily: '"Fira Code", monospace', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', '&::-webkit-scrollbar': { width: 8, height: 8 }, '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.05)', borderRadius: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: 4 }, '& mark': { transition: 'all 0.2s ease', borderRadius: '3px' } }}>
                        {renderTextWithHighlights()}
                      </Box>
                    )}
                  </Paper>
                ) : <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
              </Box>
            </Box>

            {/* Правая панель с объяснением */}
            <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 380, minWidth: 380, maxWidth: 420, p: 2, pl: 0, overflow: 'hidden' }}>
              <ExplanationPanel explanation={explanation} query={initialSearchQuery} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2, background: 'rgba(0,0,0,0.1)', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {explanation ? 'AI explanation available in the right panel' : 'Perform semantic search to generate explanations'}
          </Typography>
          <Stack direction="row" spacing={1.5}>
            {isEditing ? (
              <><Button onClick={handleEditToggle} variant="outlined">Cancel</Button><Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />} disabled={deleteFileMutation.isPending || uploadFileMutation.isPending}>{deleteFileMutation.isPending || uploadFileMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Save Changes'}</Button></>
            ) : <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>Close</Button>}
          </Stack>
        </DialogActions>
      </Dialog>
      <Menu anchorEl={actionMenuAnchor} open={Boolean(actionMenuAnchor)} onClose={() => setActionMenuAnchor(null)} PaperProps={{ sx: { mt: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(26, 31, 54, 0.98)', backdropFilter: 'blur(20px)', minWidth: 180 } }}>
        <MenuItem onClick={() => { setActionMenuAnchor(null); handleDownload(); }}><DownloadIcon fontSize="small" sx={{ mr: 1.5 }} />Download File</MenuItem>
        {isTextFile && <MenuItem onClick={() => { setActionMenuAnchor(null); handleCopyContent(); }}><ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />Copy Content</MenuItem>}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => { setActionMenuAnchor(null); setShowDeleteConfirm(true); }} sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />Delete File</MenuItem>
      </Menu>
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} PaperProps={{ sx: { borderRadius: 3, background: 'rgba(26, 31, 54, 0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' } }}>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}><DeleteIcon color="error" /><Typography variant="h6">Delete File</Typography></Stack>
          <Typography>Are you sure you want to permanently delete <strong>{file?.name}</strong>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>This action cannot be undone.</Typography>
        </Box>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setShowDeleteConfirm(false)} variant="outlined">Cancel</Button>
          <Button onClick={() => { setShowDeleteConfirm(false); handleDelete(); }} color="error" variant="contained" disabled={deleteFileMutation.isPending}>{deleteFileMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface GraphNode { id: string; path: string; name: string; file: ApiFile | null; degree: number; radius: number; x?: number; y?: number; vx?: number; vy?: number; }
interface GraphEdge { source: string; target: string; weight: number; bidirectional: boolean; }

interface SemanticGraphCanvasProps {
  files: ApiFile[]; 
  graphData?: SemanticGraphData; 
  semanticResults: SearchResultFile[];
  isSemanticSearch: boolean; 
  recommendations: RecommendationFile[]; 
  onOpenFile: (file: ApiFile) => void;
  useCurvedEdges: boolean; 
  onToggleCurvedEdges: () => void; 
  onOpenSearch: () => void; 
  onOpenTools: (e: React.MouseEvent<HTMLElement>) => void;
  searchPopupOpen: boolean; 
  searchAnchorRef: React.RefObject<HTMLButtonElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
}

const SemanticGraphCanvas: React.FC<SemanticGraphCanvasProps> = ({ 
  files, graphData, semanticResults, isSemanticSearch, recommendations, onOpenFile, 
  useCurvedEdges, onToggleCurvedEdges, onOpenSearch, onOpenTools,
  searchPopupOpen, searchAnchorRef, searchQuery, onSearchQueryChange, onSearchSubmit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragNodeIdRef = useRef<string | null>(null);
  const hoverNodeIdRef = useRef<string | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  const WORLD_SIZE = 60000;
  const WORLD_CENTER = WORLD_SIZE / 2;

  const graph = useMemo(() => { const normalized = normalizeGraph(files, graphData); return { nodes: normalized.nodes as GraphNode[], edges: normalized.edges as GraphEdge[] }; }, [files, graphData]);
  const semanticMap = useMemo(() => { const map = new Map<string, number>(); semanticResults.forEach((f) => { map.set(f.path, f.score || 0); map.set(f.name, f.score || 0); }); return map; }, [semanticResults]);
  const recommendationSet = useMemo(() => new Set(recommendations.map((r) => r.path)), [recommendations]);

  useEffect(() => {
    const nodes = graph.nodes;
    if (nodes.length === 0) return;
    const needsInit = nodes.some(node => typeof node.x !== 'number' || typeof node.y !== 'number');
    if (!needsInit) return;
    const radius = Math.min(WORLD_SIZE * 0.4, Math.max(300, nodes.length * 3));
    const center = WORLD_CENTER;
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      const randomOffset = 50 * (Math.random() - 0.5);
      node.x = center + Math.cos(angle) * radius + randomOffset;
      node.y = center + Math.sin(angle) * radius + randomOffset;
      node.vx = 0; node.vy = 0;
    });
  }, [graph.nodes]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current; const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width; canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
    };
    updateCanvasSize(); window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const nodes = graph.nodes; const edges = graph.edges;
    if (nodes.length === 0) return;

    const tick = () => {
      const width = canvas.width; const height = canvas.height;
      if (width === 0 || height === 0) { animationRef.current = requestAnimationFrame(tick); return; }

      const CENTER_FORCE = 0.00005, REPULSION_FORCE = 12042.5, EDGE_FORCE = 0.008, DAMPING = 0.85, DESIRED_DISTANCE = 1820;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = (a.x || 0) - (b.x || 0), dy = (a.y || 0) - (b.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION_FORCE / (dist * 0.5);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx = (a.vx || 0) + fx; a.vy = (a.vy || 0) + fy;
          b.vx = (b.vx || 0) - fx; b.vy = (b.vy || 0) - fy;
        }
      }

      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;
        const dx = (target.x || 0) - (source.x || 0), dy = (target.y || 0) - (source.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const diff = dist - DESIRED_DISTANCE;
        const force = diff * EDGE_FORCE;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (dragNodeIdRef.current !== source.id) { source.vx = (source.vx || 0) + fx; source.vy = (source.vy || 0) + fy; }
        if (dragNodeIdRef.current !== target.id) { target.vx = (target.vx || 0) - fx; target.vy = (target.vy || 0) - fy; }
      });

      nodes.forEach((node) => {
        if (dragNodeIdRef.current === node.id) return;
        const dx = WORLD_CENTER - (node.x || 0), dy = WORLD_CENTER - (node.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 100) { const force = CENTER_FORCE * dist; node.vx = (node.vx || 0) + dx * force; node.vy = (node.vy || 0) + dy * force; }
      });

      nodes.forEach((node) => {
        if (dragNodeIdRef.current === node.id) return;
        node.vx = (node.vx || 0) * DAMPING; node.vy = (node.vy || 0) * DAMPING;
        node.x = (node.x || 0) + (node.vx || 0); node.y = (node.y || 0) + (node.vy || 0);
        const margin = 100;
        if (node.x < margin) { node.x = margin; node.vx = Math.abs(node.vx || 0) * 0.5; }
        if (node.x > WORLD_SIZE - margin) { node.x = WORLD_SIZE - margin; node.vx = -Math.abs(node.vx || 0) * 0.5; }
        if (node.y < margin) { node.y = margin; node.vy = Math.abs(node.vy || 0) * 0.5; }
        if (node.y > WORLD_SIZE - margin) { node.y = WORLD_SIZE - margin; node.vy = -Math.abs(node.vy || 0) * 0.5; }
      });

      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0a0a0a'); gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

      const transformPoint = (x: number, y: number) => ({
        x: (x - WORLD_CENTER) * zoomRef.current + width / 2 + panRef.current.x,
        y: (y - WORLD_CENTER) * zoomRef.current + height / 2 + panRef.current.y,
      });

      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;
        const p1 = transformPoint(source.x || 0, source.y || 0);
        const p2 = transformPoint(target.x || 0, target.y || 0);
        if (p1.x < -100 && p2.x < -100) return; if (p1.x > width + 100 && p2.x > width + 100) return;
        if (p1.y < -100 && p2.y < -100) return; if (p1.y > height + 100 && p2.y > height + 100) return;

        ctx.beginPath();
        if (useCurvedEdges) {
          const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const offset = Math.min(100, dist * 0.3) * (edge.bidirectional ? 0 : 1);
          const ctrlX = midX - dy * (offset / dist), ctrlY = midY + dx * (offset / dist);
          ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
        } else { ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
        
        const intensity = Math.min(0.8, 0.3 + (edge.weight || 1) * 0.3);
        ctx.strokeStyle = `rgba(100, 150, 255, ${intensity})`;
        ctx.lineWidth = Math.max(1, Math.min(4, (edge.weight || 1) * 2));
        ctx.stroke();
        if (edge.weight > 0.8 && !edge.bidirectional) {
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const arrowSize = 8;
          const arrowX = p2.x - arrowSize * Math.cos(angle), arrowY = p2.y - arrowSize * Math.sin(angle);
          ctx.beginPath(); ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - arrowSize * Math.sin(angle), arrowY + arrowSize * Math.cos(angle));
          ctx.lineTo(arrowX + arrowSize * Math.sin(angle), arrowY - arrowSize * Math.cos(angle));
          ctx.fillStyle = `rgba(100, 150, 255, ${intensity})`; ctx.fill();
        }
      });

      nodes.forEach((node) => {
        const p = transformPoint(node.x || 0, node.y || 0);
        if (p.x < -100 || p.x > width + 100 || p.y < -100 || p.y > height + 100) return;
        const baseRadius = Math.min(24, Math.max(8, node.radius * 0.8));
        const radius = baseRadius * Math.max(0.8, zoomRef.current);
        const semanticScore = semanticMap.get(node.path) || semanticMap.get(node.name);
        const isSemanticSelected = isSemanticSearch && semanticScore !== undefined;
        const isRecommended = recommendationSet.has(node.path);
        
        let fill = '#6c6c6c';
        let glowColor = '';
        if (isRecommended) { fill = '#ff9800'; glowColor = '#ff9800'; }
        if (isSemanticSelected) { fill = '#22c55e'; glowColor = '#22c55e'; }
        
        if (glowColor && node.id === hoverNodeIdRef.current) { ctx.shadowColor = glowColor; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = node.id === hoverNodeIdRef.current ? '#ffffff' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = node.id === hoverNodeIdRef.current ? 2.5 : 1.5; ctx.stroke();
        if (radius > 14) {
          ctx.fillStyle = '#ffffff';
          const fontSize = Math.max(10, Math.min(12, radius * 0.6));
          ctx.font = `${fontSize}px "Segoe UI", "Roboto", sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          let label = ""; const maxChars = Math.floor(radius * 1.5);
          if (label.length > maxChars) label = label.slice(0, maxChars - 2) + '…';
          ctx.fillText(label, p.x, p.y);
        }
      });
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [graph, semanticMap, recommendationSet, isSemanticSearch, useCurvedEdges]);

  const getCanvasPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const worldX = (x - canvas.width / 2 - panRef.current.x) / zoomRef.current + WORLD_CENTER;
    const worldY = (y - canvas.height / 2 - panRef.current.y) / zoomRef.current + WORLD_CENTER;
    return { x: worldX, y: worldY };
  }, []);

const hitTest = useCallback((worldX: number, worldY: number) => {
  const canvas = canvasRef.current;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  for (let i = graph.nodes.length - 1; i >= 0; i--) {
    const node = graph.nodes[i];
    // Преобразуем центр узла в экранные координаты
    const screenCenter = {
      x: ((node.x || 0) - WORLD_CENTER) * zoomRef.current + canvas.width / 2 + panRef.current.x,
      y: ((node.y || 0) - WORLD_CENTER) * zoomRef.current + canvas.height / 2 + panRef.current.y
    };
    // Базовый радиус (как в отрисовке)
    const baseRadius = Math.min(24, Math.max(8, node.radius * 0.8));
    const screenRadius = baseRadius * Math.max(0.8, zoomRef.current);
    // Преобразуем мировую точку клика в экранные координаты
    const clickScreen = {
      x: (worldX - WORLD_CENTER) * zoomRef.current + canvas.width / 2 + panRef.current.x,
      y: (worldY - WORLD_CENTER) * zoomRef.current + canvas.height / 2 + panRef.current.y
    };
    const dx = clickScreen.x - screenCenter.x;
    const dy = clickScreen.y - screenCenter.y;
    if (Math.sqrt(dx*dx + dy*dy) <= screenRadius) {
      return node;
    }
  }
  return null;
}, [graph.nodes, zoomRef, panRef]);

  const isPanningRef = useRef(false); const lastMouseRef = useRef({ x: 0, y: 0 });

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh', backgroundColor: '#000', overflow: 'hidden' }}>
      <canvas ref={canvasRef} onWheel={(e) => { e.preventDefault(); const delta = e.deltaY > 0 ? 0.9 : 1.1; zoomRef.current = Math.max(0.1, Math.min(2, zoomRef.current * delta));}}
        onMouseDown={(e) => { const p = getCanvasPoint(e); const node = hitTest(p.x, p.y); if (node) { dragNodeIdRef.current = node.id; } else { isPanningRef.current = true; lastMouseRef.current = { x: e.clientX, y: e.clientY }; } }}
        onMouseMove={(e) => { const p = getCanvasPoint(e); const node = hitTest(p.x, p.y); hoverNodeIdRef.current = node?.id || null; setHoveredNode(node || null);
          if (dragNodeIdRef.current) { const dragged = graph.nodes.find((n) => n.id === dragNodeIdRef.current); if (dragged) { dragged.x = p.x; dragged.y = p.y; dragged.vx = 0; dragged.vy = 0; } }
          else if (isPanningRef.current) { const dx = e.clientX - lastMouseRef.current.x, dy = e.clientY - lastMouseRef.current.y; panRef.current.x += dx; panRef.current.y += dy; lastMouseRef.current = { x: e.clientX, y: e.clientY }; } }}
        onMouseUp={() => { dragNodeIdRef.current = null; isPanningRef.current = false; }}
        onMouseLeave={() => { dragNodeIdRef.current = null; isPanningRef.current = false; hoverNodeIdRef.current = null; setHoveredNode(null); }}
        onDoubleClick={(e) => { const p = getCanvasPoint(e); const node = hitTest(p.x, p.y); if (node?.file) onOpenFile(node.file); }}
        onClick={(e) => { const p = getCanvasPoint(e); const node = hitTest(p.x, p.y); if (node?.file) onOpenFile(node.file); }}
        style={{ width: '100%', height: '100%', display: 'block', cursor: dragNodeIdRef.current ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }} />

      <Box sx={{ position: 'absolute', top: 16, left: 100, display: 'flex', alignItems: 'center', gap: 1, zIndex: 10, pointerEvents: 'none' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'auto', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <Paper elevation={3} sx={{ p: 0.5, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Tooltip title="Semantic Search">
              <IconButton ref={searchAnchorRef} size="small" sx={{ color: 'white'}} onClick={onOpenSearch}><SearchIcon /></IconButton>
            </Tooltip>
          </Paper>
          
          <Slide direction="left" in={searchPopupOpen} mountOnEnter unmountOnExit timeout={300}>
            <Paper elevation={6} sx={{
              px: 2, py: 1, borderRadius: 2, background: 'rgba(26, 31, 54, 0.98)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1,
              animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '@keyframes slideIn': { from: { opacity: 0, transform: 'translateX(-20px) scale(0.95)' }, to: { opacity: 1, transform: 'translateX(0) scale(1)' } },
            }}>
              <TextField 
                variant="standard" 
                placeholder="Search by meaning..." 
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                InputProps={{ disableUnderline: true, sx: { fontSize: '0.875rem', color: 'white', '& input::placeholder': { color: 'rgba(255,255,255,0.6)' } } }} 
                size="small" 
                sx={{ minWidth: 200 }} 
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') onSearchSubmit(); }}
              />
              <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={onOpenSearch}><CloseIcon fontSize="small" /></IconButton>
            </Paper>
          </Slide>
        </Box>

        <Box sx={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: searchPopupOpen ? 'translateX(8px)' : 'translateX(0)' }}>
          <Paper elevation={3} sx={{ p: 0.5, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
            <Tooltip title="Tools"><IconButton size="small" sx={{ color: 'white' }} onClick={onOpenTools}><TuneIcon /></IconButton></Tooltip>
          </Paper>
        </Box>

        <Box sx={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: searchPopupOpen ? 'translateX(16px)' : 'translateX(0)' }}>
          <Paper elevation={3} sx={{ p: 0.5, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
            <Tooltip title={useCurvedEdges ? 'Switch to straight edges' : 'Switch to curved edges'}>
              <IconButton size="small" sx={{ color: 'white' }} onClick={onToggleCurvedEdges}>{useCurvedEdges ? <ShowChartIcon /> : <TimelineIcon />}</IconButton>
            </Tooltip>
          </Paper>
        </Box>

        {recommendations.length > 0 && (
          <Box sx={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: searchPopupOpen ? 'translateX(24px)' : 'translateX(0)' }}>
            <Paper elevation={3} sx={{ px: 1.5, py: 0.5, borderRadius: 2, background: 'rgba(255, 152, 0, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 152, 0, 0.3)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AutoAwesomeIcon sx={{ fontSize: 16, color: '#ff9800' }} />
              <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 500 }}>{recommendations.length}</Typography>
            </Paper>
          </Box>
        )}
      </Box>

      <Box sx={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 1, zIndex: 10, pointerEvents: 'none' }}>
        <Paper elevation={3} sx={{ p: 0.5, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Zoom out">
            <IconButton 
              size="small" 
              onClick={() => { 
                zoomRef.current = Math.max(0.1, zoomRef.current * 0.9); // 0.3 → 0.1
              }} 
              sx={{ color: 'white' }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ color: 'white', minWidth: 40, textAlign: 'center' }}>{Math.round(zoomRef.current * 100)}%</Typography>
          <Tooltip title="Zoom in"><IconButton size="small" onClick={() => { zoomRef.current = Math.min(2, zoomRef.current * 1.1); }} sx={{ color: 'white' }}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Reset view"><IconButton size="small" onClick={() => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; }} sx={{ color: 'white' }}><CenterFocusStrongIcon fontSize="small" /></IconButton></Tooltip>
        </Paper>
      </Box>

      <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 1, flexWrap: 'wrap', zIndex: 10, pointerEvents: 'none' }}>
        <Paper elevation={3} sx={{ px: 1.5, py: 0.75, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
          <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#6c6c6c' }} /><Typography variant="caption" sx={{ color: 'white' }}>Files</Typography></Stack>
        </Paper>
        <Paper elevation={3} sx={{ px: 1.5, py: 0.75, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
          <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e' }} /><Typography variant="caption" sx={{ color: 'white' }}>Semantic</Typography></Stack>
        </Paper>
        <Paper elevation={3} sx={{ px: 1.5, py: 0.75, borderRadius: 2, background: 'rgba(26, 31, 54, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'auto' }}>
          <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff9800' }} /><Typography variant="caption" sx={{ color: 'white' }}>Recommended</Typography></Stack>
        </Paper>
      </Box>

      {hoveredNode && (
        <Paper elevation={6} sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', p: 1.5, minWidth: 220, maxWidth: 320, background: 'rgba(18,18,18,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', zIndex: 10, pointerEvents: 'none' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{hoveredNode.name}</Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', wordBreak: 'break-word' }}>{hoveredNode.path}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
            <Chip label={`${hoveredNode.degree} edges`} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
            {hoveredNode.file && <Chip label={formatFileSize(hoveredNode.file.size)} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />}
            {semanticMap.has(hoveredNode.path) && <Chip label={`Similarity ${(semanticMap.get(hoveredNode.path) || 0).toFixed(2)}`} size="small" sx={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }} />}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

interface FilesViewProps { containerId: string; }

export default function FilesView({ containerId }: FilesViewProps) {
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(containerId);
  const { data: graphData } = useGetSemanticGraph(containerId);
  
  const { addNotification, notification, closeNotification } = useNotifications();
  const semanticSearchMutation = useSemanticSearch();

  const { paths: recommendedPaths } = useRecommendationsStream(containerId,
    (newPaths) => addNotification({ message: `Found ${newPaths.length} recommended files`, severity: 'info', open: true }),
    (finalPaths) => addNotification({ message: `Recommendations completed: ${finalPaths.length} files`, severity: 'success', open: true })
  );

  const [fileContentDialog, setFileContentDialog] = useState<{ open: boolean; file: ApiFile | null; currentIndex: number; }>({ open: false, file: null, currentIndex: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [useCurvedEdges, setUseCurvedEdges] = useState(true);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [rebuildNotification, setRebuildNotification] = useState<{ open: boolean; message: string; severity: Severity; }>({ open: false, message: '', severity: 'info' });
  
  const searchAnchorRef = useRef<HTMLButtonElement>(null);

  const recommendationFiles: RecommendationFile[] = recommendedPaths.map((path) => ({ path, name: path.split('/').pop() || 'unknown', isRecommended: true }));
  const currentFilesList = useMemo(() => {
    if (isSemanticSearch) return [...searchResults].reverse();
    if (!searchQuery) return [...files].reverse();
    return [...files].filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()) || file.path.toLowerCase().includes(searchQuery.toLowerCase()) || file.mime_type.toLowerCase().includes(searchQuery.toLowerCase())).reverse();
  }, [isSemanticSearch, searchResults, searchQuery, files]);

  const handleSemanticSearch = useCallback(async (query: string) => {
    if (!query.trim() || !containerId) return;
    setIsSearching(true); setIsSemanticSearch(true); setShowSearchPopup(false);
    try {
      const result: any = await semanticSearchMutation.mutateAsync({ query, container_id: containerId, limit: 50 });
      const resultFiles: SearchResultFile[] = (result.results || []).filter((r: any) => r.scope !== undefined).map((r: any) => {
        const existing = files.find((f) => f.path === r.path || f.name === r.path);
        return { path: existing?.path || r.path, name: existing?.name || r.path.split('/').pop() || 'unknown', size: existing?.size || 0, container_id: containerId, user_id: existing?.user_id || '', created_at: existing?.created_at || new Date().toISOString(), mime_type: existing?.mime_type || 'text/plain', score: r.scope, content_preview: `Score: ${r.scope.toFixed(2)}` };
      }).filter((f: { name: string; }) => !['container_config.json', 'access_policy.json'].includes(f.name));
      setSearchResults(resultFiles);
      addNotification({ message: `Found ${resultFiles.length} semantically relevant files`, severity: 'success', open: true });
    } catch (error) {
      addNotification({ message: `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error', open: true });
      setIsSemanticSearch(false);
    } finally { setIsSearching(false); }
  }, [containerId, semanticSearchMutation, addNotification, files]);

  const handleSearchChange = useCallback((value: string) => { setSearchQuery(value); if (!value.trim()) { setIsSemanticSearch(false); setSearchResults([]); } }, []);
  const handleSearchSubmit = useCallback(() => { if (searchQuery.trim() && containerId) handleSemanticSearch(searchQuery); }, [searchQuery, containerId, handleSemanticSearch]);
  
  const handleRefreshFiles = useCallback(async () => {
    if (!containerId) return; setIsRebuildingIndex(true);
    try {
      const result = await apiClient.getFilesRebuildIndex(containerId); refetchFiles();
      setRebuildNotification({ open: true, message: `File index rebuilt successfully. Found ${result.length} files.`, severity: 'success' });
      addNotification({ message: `File index rebuilt. ${result.length} files found.`, severity: 'success', open: true });
    } catch (error) {
      setRebuildNotification({ open: true, message: `Failed to rebuild index: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
      addNotification({ message: 'Failed to rebuild file index', severity: 'error', open: true });
      refetchFiles();
    } finally { setIsRebuildingIndex(false); }
  }, [containerId, refetchFiles, addNotification]);

  const openFile = useCallback((file: ApiFile) => {
    const fileIndex = currentFilesList.findIndex((f) => f.path === file.path || f.name === file.name);
    setFileContentDialog({ open: true, file, currentIndex: fileIndex >= 0 ? fileIndex : 0 });
  }, [currentFilesList]);

  const handleCloseFileContent = useCallback(() => { setFileContentDialog({ open: false, file: null, currentIndex: 0 }); }, []);
  
  const handleNextFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    const nextIndex = (fileContentDialog.currentIndex + 1) % currentFilesList.length;
    setFileContentDialog({ open: true, file: currentFilesList[nextIndex], currentIndex: nextIndex });
  }, [fileContentDialog, currentFilesList]);

  const handlePrevFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    const prevIndex = fileContentDialog.currentIndex > 0 ? fileContentDialog.currentIndex - 1 : currentFilesList.length - 1;
    setFileContentDialog({ open: true, file: currentFilesList[prevIndex], currentIndex: prevIndex });
  }, [fileContentDialog, currentFilesList]);

  const handleToggleCurvedEdges = useCallback(() => setUseCurvedEdges(prev => !prev), []);
  const handleOpenSearch = useCallback(() => setShowSearchPopup(prev => !prev), []);
  const handleOpenTools = useCallback((e: React.MouseEvent<HTMLElement>) => setToolsMenuAnchor(e.currentTarget), []);

  if (!containerId) {
    return (<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' }}>
      <DescriptionIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
      <Typography variant="h4" color="text.secondary" gutterBottom sx={{ fontWeight: 300 }}>No Container Selected</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>Please select a container from the sidebar to view and manage its files</Typography>
    </Box>);
  }

 return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
      }}
    >
      <Menu anchorEl={toolsMenuAnchor} open={Boolean(toolsMenuAnchor)} onClose={() => setToolsMenuAnchor(null)} PaperProps={{ sx: { mt: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(26, 31, 54, 0.98)', backdropFilter: 'blur(20px)' } }}>
        <MenuItem onClick={() => { setToolsMenuAnchor(null); handleRefreshFiles(); }} disabled={isRebuildingIndex}><RefreshIcon sx={{ mr: 1, fontSize: 20 }} />{isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}</MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => setToolsMenuAnchor(null)}><SettingsIcon sx={{ mr: 1, fontSize: 20 }} />Settings</MenuItem>
      </Menu>

      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {isLoadingFiles ? (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>) : files.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', p: 4 }}>
            <DescriptionIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 300 }}>No Files Available</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>This container doesn&apos;t have any files yet. Try rebuilding the index or uploading files.</Typography>
            <Button variant="contained" onClick={handleRefreshFiles} startIcon={<RefreshIcon />} disabled={isRebuildingIndex}>{isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}</Button>
          </Box>
        ) : (
          <SemanticGraphCanvas
            files={files} 
            graphData={graphData} 
            semanticResults={searchResults} 
            isSemanticSearch={isSemanticSearch}
            recommendations={recommendationFiles} 
            onOpenFile={openFile} 
            useCurvedEdges={useCurvedEdges}
            onToggleCurvedEdges={handleToggleCurvedEdges} 
            onOpenSearch={handleOpenSearch} 
            onOpenTools={handleOpenTools}
            searchPopupOpen={showSearchPopup} 
            searchAnchorRef={searchAnchorRef}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
          />
        )}
      </Box>

      <FileContentDialog 
        open={fileContentDialog.open} 
        onClose={handleCloseFileContent} 
        file={fileContentDialog.file} 
        containerId={containerId} 
        allFiles={files} 
        onFileUpdated={refetchFiles} 
        onFileDeleted={refetchFiles} 
        searchQuery={searchQuery} 
        currentFileIndex={fileContentDialog.currentIndex} 
        totalFiles={currentFilesList.length} 
        onNextFile={handleNextFile} 
        onPrevFile={handlePrevFile} 
      />
      <Snackbar open={rebuildNotification.open} autoHideDuration={6000} onClose={() => setRebuildNotification((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={rebuildNotification.severity} onClose={() => setRebuildNotification((prev) => ({ ...prev, open: false }))} variant="filled" sx={{ width: '100%' }}>{rebuildNotification.message}</Alert>
      </Snackbar>
      <Snackbar open={notification.open} autoHideDuration={4000} onClose={closeNotification} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={notification.severity} onClose={closeNotification} variant="filled" sx={{ width: '100%' }}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
}