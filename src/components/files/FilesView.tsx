import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Fade,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
  Snackbar,
  Paper,
  Collapse,
  Menu,
  MenuItem,
  Stack,
  Card,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogActions,
  Divider,
  Switch,
  FormControlLabel,
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
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../api/client';
import type { 
  ApiFile, 
  SearchRequest, 
  SearchResult,
  SearchResultFile,
  FileContent,
  RecommendationEvent,
  SemanticGraphData,
  SemanticGraphEdge,
  SemanticGraphNode,
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

const SEARCH_SUGGESTIONS = ['authentication', 'database', 'error handling', 'API endpoints', 'configuration'];

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

const normalizeGraph = (
  files: ApiFile[],
  graphData: SemanticGraphData | undefined
) => {
  const fileMap = new Map<string, ApiFile>();
  files.forEach((f) => {
    fileMap.set(f.path, f);
    fileMap.set(f.name, f);
  });

  // Проверяем, пришли ли данные в формате { graph: [...] } или { nodes: [], edges: [] }
  let rawEdges: any[] = [];
  let rawNodes: any[] = [];
  
  if (graphData) {
    // Если есть поле graph (как в вашем случае)
    if (Array.isArray((graphData as any).graph)) {
      rawEdges = (graphData as any).graph;
      console.log('Found graph array with', rawEdges.length, 'edges');
    }
    // Если есть стандартные поля nodes/edges
    else if (graphData.edges || graphData.links) {
      rawEdges = graphData.edges || graphData.links || [];
      rawNodes = graphData.nodes || [];
    }
    // Если graphData сам является массивом
    else if (Array.isArray(graphData)) {
      rawEdges = graphData;
    }
  }

  // Если нет узлов, но есть ребра, создаем узлы из ребер
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
    
    console.log('Created', rawNodes.length, 'nodes from edges');
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

  // Добавляем все файлы как потенциальные узлы
  files.forEach((file) => {
    nodePaths.add(file.path);
    nodeIdToPath.set(file.path, file.path);
  });

  const normalizedEdges = rawEdges
    .map((edge: any) => {
      const rawSource = edge.source || edge.from;
      const rawTarget = edge.target || edge.to;
      
      if (!rawSource || !rawTarget) {
        console.warn('Edge missing source or target:', edge);
        return null;
      }
      
      const source = nodeIdToPath.get(rawSource) || rawSource;
      const target = nodeIdToPath.get(rawTarget) || rawTarget;
      
      if (!source || !target) {
        console.warn('Edge with invalid source/target after mapping:', { 
          rawSource, rawTarget, source, target 
        });
        return null;
      }
      
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

  console.log('Normalized edges count:', normalizedEdges.length);
  if (normalizedEdges.length > 0) {
    console.log('First 3 edges:', normalizedEdges.slice(0, 3));
  }

  // Вычисляем степень для каждого узла
  const degreeMap = new Map<string, number>();
  nodePaths.forEach((p) => degreeMap.set(p, 0));
  normalizedEdges.forEach((edge) => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  });

  // Создаем узлы
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

  console.log('Total nodes:', nodes.length);
  console.log('Nodes with degree > 0:', nodes.filter(n => n.degree > 0).length);

  return { nodes, edges: normalizedEdges };
};

const findReferencedFilesInText = (content: string, files: ApiFile[]) => {
  const result: Array<{
    label: string;
    file: ApiFile;
    start: number;
    end: number;
  }> = [];

  const used = new Set<string>();

  files.forEach((file) => {
    const candidates = Array.from(new Set([file.path, file.name].filter(Boolean))).sort(
      (a, b) => b.length - a.length
    );

    candidates.forEach((candidate) => {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^\\w./-])(${escaped})(?=$|[^\\w./-])`, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const full = match[2];
        const start = match.index + match[1].length;
        const end = start + full.length;
        const key = `${file.path}:${start}:${end}`;
        if (!used.has(key)) {
          used.add(key);
          result.push({
            label: full,
            file,
            start,
            end,
          });
        }
      }
    });
  });

  return result.sort((a, b) => a.start - b.start);
};

const LinkedFileTextPanel: React.FC<{
  file: ApiFile | null;
  containerId: string;
  allFiles: ApiFile[];
  title: string;
}> = ({ file, containerId, allFiles, title }) => {
  const { data, isLoading, error } = useFileContent(containerId, file?.name || '');

  const content = data?.content || '';

  const linkedContent = useMemo(() => {
    if (!content || !file) return content;
    const refs = findReferencedFilesInText(content, allFiles).filter((r) => r.file.path !== file.path);
    if (!refs.length) return content;

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    refs.forEach((ref, index) => {
      if (ref.start > lastIndex) {
        nodes.push(<span key={`t-${index}`}>{content.slice(lastIndex, ref.start)}</span>);
      }
      nodes.push(
        <Box
          key={`l-${index}`}
          component="span"
          sx={{
            color: '#90caf9',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(144,202,249,0.55)',
            cursor: 'default',
          }}
        >
          {content.slice(ref.start, ref.end)}
        </Box>
      );
      lastIndex = ref.end;
    });

    if (lastIndex < content.length) {
      nodes.push(<span key="t-last">{content.slice(lastIndex)}</span>);
    }

    return nodes;
  }, [content, allFiles, file]);

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: '100%', lg: 360 },
        minWidth: { xs: '100%', lg: 320 },
        maxWidth: { xs: '100%', lg: 420 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.32)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {file?.path || 'No linked file selected'}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
        {!file ? (
          <Typography variant="body2" color="text.secondary">
            Click a file reference in the main text to open it here.
          </Typography>
        ) : isLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} spacing={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading linked file...
            </Typography>
          </Stack>
        ) : error ? (
          <Typography variant="body2" color="error.main">
            {error instanceof Error ? error.message : 'Failed to load linked file'}
          </Typography>
        ) : (
          <Box
            sx={{
              fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
              fontSize: '0.82rem',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {linkedContent}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

const FileContentDialog: React.FC<FileContentDialogProps> = ({
  open,
  onClose,
  file,
  containerId,
  allFiles,
  onFileUpdated,
  onFileDeleted,
  searchQuery: initialSearchQuery = '',
  currentFileIndex = 0,
  totalFiles = 0,
  onNextFile,
  onPrevFile,
}) => {
  const { data: fileContent, isLoading, error, refetch } = useFileContent(containerId, file?.name || '');
  const deleteFileMutation = useDeleteFile();
  const uploadFileMutation = useUploadFile();
  const { addNotification } = useNotifications();

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
  const [linkedFile, setLinkedFile] = useState<ApiFile | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const isTextFile = file?.mime_type?.startsWith('text/') || file?.mime_type === 'application/json';

  const parseSearchQuery = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchQuery.trim().split(/\s+/).filter(Boolean);
  }, [searchQuery]);

  const findSearchMatches = useMemo(() => {
    if (!searchQuery.trim() || !editedContent || parseSearchQuery.length === 0) return [];
    const words = parseSearchQuery;
    const matches: SearchMatch[] = [];
    const content = matchCase ? editedContent : editedContent.toLowerCase();

    words.forEach((word, wordIndex) => {
      const searchTerm = matchCase ? word : word.toLowerCase();
      const positions: number[] = [];

      if (wholeWord) {
        const regex = new RegExp(
          `\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          matchCase ? 'g' : 'gi'
        );
        let match;
        while ((match = regex.exec(editedContent)) !== null) {
          positions.push(match.index);
        }
      } else {
        let position = content.indexOf(searchTerm);
        while (position !== -1) {
          positions.push(position);
          position = content.indexOf(searchTerm, position + 1);
        }
      }

      if (positions.length > 0) {
        matches.push({
          word,
          positions,
          color: HIGHLIGHT_COLORS[wordIndex % HIGHLIGHT_COLORS.length],
        });
      }
    });

    return matches;
  }, [editedContent, searchQuery, parseSearchQuery, matchCase, wholeWord]);

  const totalMatches = useMemo(
    () => searchMatches.reduce((sum, match) => sum + match.positions.length, 0),
    [searchMatches]
  );

  useEffect(() => {
    if (file?.name && open) {
      setIsEditing(false);
      setEditedContent('');
      setSaveError('');
      setActionMenuAnchor(null);
      setShowDeleteConfirm(false);
      setSearchQuery(initialSearchQuery);
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(!!initialSearchQuery);
      setCopied(false);
      setMatchCase(false);
      setWholeWord(false);
      setLinkedFile(null);
      setTimeout(() => refetch(), 100);
    }
  }, [file?.name, initialSearchQuery, open, refetch]);

  useEffect(() => {
    if (fileContent?.content && !editedContent) {
      setEditedContent(fileContent.content);
    }
  }, [fileContent, editedContent]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedContent('');
      setSaveError('');
      setActionMenuAnchor(null);
      setShowDeleteConfirm(false);
      setSearchQuery('');
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(false);
      setCopied(false);
      setMatchCase(false);
      setWholeWord(false);
      setLinkedFile(null);
    }
  }, [open]);

  useEffect(() => {
    const matches = findSearchMatches;
    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 && matches[0].positions.length > 0 ? 0 : -1);
  }, [findSearchMatches]);

  const flattenRanges = useMemo(() => {
    const ranges: Array<{
      start: number;
      end: number;
      color: string;
      word: string;
      isCurrent: boolean;
    }> = [];

    searchMatches.forEach((match) => {
      match.positions.forEach((pos) => {
        ranges.push({
          start: pos,
          end: pos + match.word.length,
          color: match.color,
          word: match.word,
          isCurrent: false,
        });
      });
    });

    ranges.sort((a, b) => a.start - b.start);

    if (currentMatchIndex >= 0 && currentMatchIndex < ranges.length) {
      ranges[currentMatchIndex].isCurrent = true;
    }

    return ranges;
  }, [searchMatches, currentMatchIndex]);

  useEffect(() => {
    if (currentMatchIndex < 0 || !contentScrollRef.current) return;
    const marks = contentScrollRef.current.querySelectorAll('[data-current-match="true"]');
    const current = marks[0] as HTMLElement | undefined;
    if (current) {
      current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIndex, flattenRanges]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchActive(!!e.target.value.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setIsSearchActive(false);
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => {
      const next = prev + 1;
      return next >= totalMatches ? 0 : next;
    });
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => {
      const next = prev - 1;
      return next < 0 ? totalMatches - 1 : next;
    });
  };

  const handleCopyContent = useCallback(async () => {
    if (!editedContent) return;
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification({
        message: 'Content copied to clipboard',
        severity: 'success',
        open: true,
      });
    } catch (_err) {
      addNotification({
        message: 'Failed to copy content',
        severity: 'error',
        open: true,
      });
    }
  }, [editedContent, addNotification]);

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
    setSaveError('');
  };

  const handleSave = useCallback(async () => {
    if (!file || !containerId) return;
    setSaveError('');
    try {
      const blob = new Blob([editedContent], { type: file.mime_type || 'text/plain' });
      const newFile = new File([blob], file.name, {
        type: file.mime_type || 'text/plain',
        lastModified: Date.now(),
      });

      await deleteFileMutation.mutateAsync({
        fileId: file.name,
        containerId,
      });

      await uploadFileMutation.mutateAsync({
        containerId,
        file: newFile,
      });

      addNotification({
        message: `File "${file.name}" updated successfully`,
        severity: 'success',
        open: true,
      });

      setIsEditing(false);
      onFileUpdated?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      setSaveError(errorMessage);
      addNotification({
        message: errorMessage,
        severity: 'error',
        open: true,
      });
    }
  }, [file, containerId, editedContent, deleteFileMutation, uploadFileMutation, addNotification, onFileUpdated, onClose]);

  const handleDelete = useCallback(async () => {
    if (!file || !containerId) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: file.name,
        containerId,
      });
      addNotification({
        message: `File "${file.name}" deleted successfully`,
        severity: 'success',
        open: true,
      });
      onClose();
      onFileDeleted?.();
    } catch (error) {
      addNotification({
        message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  }, [file, containerId, deleteFileMutation, addNotification, onClose, onFileDeleted]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      const blob = await apiClient.downloadFile(file.name, containerId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addNotification({
        message: `File "${file.name}" downloaded`,
        severity: 'success',
        open: true,
      });
    } catch (error) {
      addNotification({
        message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    }
  }, [file, containerId, addNotification]);

  const renderTextWithLinksAndHighlights = () => {
    if (!editedContent) return null;

    const references = findReferencedFilesInText(editedContent, allFiles).filter(
      (ref) => ref.file.path !== file?.path
    );

    const breakpoints = new Set<number>([0, editedContent.length]);
    flattenRanges.forEach((r) => {
      breakpoints.add(r.start);
      breakpoints.add(r.end);
    });
    references.forEach((r) => {
      breakpoints.add(r.start);
      breakpoints.add(r.end);
    });

    const sortedPoints = Array.from(breakpoints).sort((a, b) => a - b);
    const parts: React.ReactNode[] = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const start = sortedPoints[i];
      const end = sortedPoints[i + 1];
      if (start === end) continue;

      const text = editedContent.slice(start, end);
      const highlight = flattenRanges.find((r) => start >= r.start && end <= r.end);
      const reference = references.find((r) => start >= r.start && end <= r.end);

      let node: React.ReactNode = text;

      if (reference) {
        node = (
          <Box
            component="span"
            onClick={() => setLinkedFile(reference.file)}
            sx={{
              color: '#90caf9',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(144,202,249,0.55)',
              cursor: 'pointer',
              '&:hover': {
                color: '#bbdefb',
                backgroundColor: 'rgba(144,202,249,0.08)',
              },
            }}
          >
            {text}
          </Box>
        );
      }

      if (highlight) {
        node = (
          <mark
            data-current-match={highlight.isCurrent ? 'true' : 'false'}
            style={{
              backgroundColor: highlight.color,
              color: 'inherit',
              padding: '0 2px',
              borderRadius: '3px',
              fontWeight: highlight.isCurrent ? 'bold' : 'normal',
              border: highlight.isCurrent ? '2px solid #ff9800' : 'none',
              boxShadow: highlight.isCurrent ? '0 0 8px rgba(255, 152, 0, 0.5)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {node}
          </mark>
        );
      }

      parts.push(<React.Fragment key={`${start}-${end}`}>{node}</React.Fragment>);
    }

    return parts;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && isEditing) {
        e.preventDefault();
        handleSave();
      }

      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        setIsEditing(false);
        setEditedContent(fileContent?.content || '');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isEditing, handleSave, fileContent]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.98) 0%, rgba(26, 31, 54, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            width: '96vw',
            height: '92vh',
            maxWidth: '96vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            flex: 1,
            display: 'flex',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: 260,
              minWidth: 260,
              maxWidth: 260,
              borderRight: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {file?.name || file?.path.split('/').pop()}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                  {file?.path}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={getLanguageFromMimeType(file?.mime_type || '')} size="small" color="primary" />
                  <Chip label={formatFileSize(file?.size || 0)} size="small" variant="outlined" />
                </Stack>
                {totalFiles > 1 && (
                  <Typography variant="caption" color="text.secondary">
                    File {currentFileIndex + 1} of {totalFiles}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Box sx={{ p: 2, overflow: 'auto' }}>
              <Stack spacing={1.2}>
                {totalFiles > 1 && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<ChevronLeftIcon />}
                      onClick={onPrevFile}
                    >
                      Prev
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      endIcon={<ChevronRightIcon />}
                      onClick={onNextFile}
                    >
                      Next
                    </Button>
                  </Stack>
                )}

                {isTextFile && (
                  <>
                    <Button
                      fullWidth
                      variant={copied ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      onClick={handleCopyContent}
                      color={copied ? 'success' : 'primary'}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      fullWidth
                      variant={isEditing ? 'contained' : 'outlined'}
                      size="small"
                      startIcon={<EditIcon />}
                      color={isEditing ? 'warning' : 'primary'}
                      onClick={handleEditToggle}
                    >
                      {isEditing ? 'Cancel Edit' : 'Edit'}
                    </Button>
                  </>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Download
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<MoreVertIcon />}
                  onClick={(e) => setActionMenuAnchor(e.currentTarget)}
                >
                  More
                </Button>

                <Divider sx={{ my: 1 }} />

                {isSearchActive && searchMatches.length > 0 && (
                  <Chip
                    icon={<SearchIcon />}
                    label={`${totalMatches} matches`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                )}

                {isEditing && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Ctrl/Cmd + S to save
                  </Alert>
                )}

                {saveError && (
                  <Alert severity="error" onClose={() => setSaveError('')}>
                    {saveError}
                  </Alert>
                )}
              </Stack>
            </Box>
          </Paper>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRight: { xs: 'none', lg: '1px solid rgba(255,255,255,0.08)' },
                overflow: 'hidden',
              }}
            >
              {isTextFile && !isEditing && (
                <Paper
                  elevation={0}
                  sx={{
                    mx: 2,
                    mt: 2,
                    mb: 1,
                    borderRadius: 2,
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <Stack sx={{ p: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TextField
                        fullWidth
                        variant="standard"
                        placeholder="Search within file (separate words with spaces)..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        InputProps={{
                          disableUnderline: true,
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" sx={{ opacity: 0.7, mr: 1 }} />
                            </InputAdornment>
                          ),
                          sx: {
                            fontSize: '0.875rem',
                            '& input::placeholder': {
                              color: 'text.secondary',
                              opacity: 0.7,
                            },
                          },
                        }}
                        size="small"
                      />

                      {searchQuery && (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                          <Badge
                            badgeContent={parseSearchQuery.length}
                            color="primary"
                            sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}
                          >
                            <TextFieldsIcon fontSize="small" sx={{ opacity: 0.7 }} />
                          </Badge>

                          <Typography variant="caption" sx={{ whiteSpace: 'nowrap', opacity: 0.8 }}>
                            {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : 'No matches'}
                          </Typography>

                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Previous match">
                              <span>
                                <IconButton size="small" onClick={handlePrevMatch} disabled={totalMatches === 0}>
                                  <NavigateBeforeIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Next match">
                              <span>
                                <IconButton size="small" onClick={handleNextMatch} disabled={totalMatches === 0}>
                                  <NavigateNextIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Clear search">
                              <IconButton size="small" onClick={handleClearSearch}>
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      )}
                    </Stack>

                    {searchQuery && (
                      <Fade in={!!searchQuery}>
                        <Stack direction="row" spacing={2} sx={{ mt: 1, ml: 4 }}>
                          <FormControlLabel
                            control={
                              <Switch size="small" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
                            }
                            label={<Typography variant="caption">Match case</Typography>}
                          />
                          <FormControlLabel
                            control={
                              <Switch size="small" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />
                            }
                            label={<Typography variant="caption">Whole word</Typography>}
                          />
                        </Stack>
                      </Fade>
                    )}

                    {searchQuery && parseSearchQuery.length > 0 && (
                      <Fade in={parseSearchQuery.length > 0}>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, ml: 4, flexWrap: 'wrap', gap: 1 }}>
                          {parseSearchQuery.map((word, index) => {
                            const match = searchMatches.find((m) => m.word === word);
                            return (
                              <Chip
                                key={`${word}-${index}`}
                                label={word}
                                size="small"
                                sx={{
                                  backgroundColor: match ? match.color : 'rgba(255,255,255,0.1)',
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  font: match ? 500 : 400,
                                  '& .MuiChip-label': { px: 1 },
                                }}
                              />
                            );
                          })}
                        </Stack>
                      </Fade>
                    )}
                  </Stack>
                </Paper>
              )}

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  p: 2,
                  pt: isTextFile && !isEditing ? 0 : 2,
                  overflow: 'hidden',
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Stack alignItems="center" spacing={2}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        Loading file content...
                      </Typography>
                    </Stack>
                  </Box>
                ) : error ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center', p: 4 }}>
                    <CodeIcon sx={{ fontSize: 96, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>
                      Unable to Load File
                    </Typography>
                    <Typography variant="body1" sx={{ maxWidth: 400 }}>
                      {error instanceof Error ? error.message : 'An unknown error occurred while loading the file'}
                    </Typography>
                  </Box>
                ) : !isTextFile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center', p: 4 }}>
                    <DescriptionIcon sx={{ fontSize: 96, mb: 3, opacity: 0.3 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>
                      Binary File Preview
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, maxWidth: 400 }}>
                      This file type cannot be displayed in the text viewer. Download the file to view its contents with an appropriate application.
                    </Typography>
                    <Button variant="contained" size="large" startIcon={<DownloadIcon />} onClick={handleDownload}>
                      Download File
                    </Button>
                  </Box>
                ) : fileContent && editedContent !== undefined ? (
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        flexShrink: 0,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={getLanguageFromMimeType(file?.mime_type || '')} size="small" color="primary" />
                          {linkedFile && (
                            <Chip
                              icon={<OpenInNewIcon />}
                              label={`Linked: ${linkedFile.name}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {fileContent.encoding} • {formatFileSize(fileContent.size)} • {editedContent.split('\n').length} lines
                        </Typography>
                      </Stack>
                    </Box>

                    {isEditing ? (
                      <Box sx={{ flex: 1, minHeight: 0, p: 2 }}>
                        <TextField
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          multiline
                          fullWidth
                          sx={{
                            height: '100%',
                            '& .MuiOutlinedInput-root': {
                              height: '100%',
                              alignItems: 'flex-start',
                              borderRadius: 2,
                            },
                            '& .MuiOutlinedInput-input': {
                              fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
                              fontSize: '0.875rem',
                              lineHeight: 1.6,
                              p: 3,
                              height: '100% !important',
                              overflow: 'auto !important',
                            },
                          }}
                          InputProps={{ style: { height: '100%' } }}
                        />
                      </Box>
                    ) : (
                      <Box
                        ref={contentScrollRef}
                        sx={{
                          flex: 1,
                          minHeight: 0,
                          overflow: 'auto',
                          p: 3,
                          fontFamily: '"Fira Code", "Monaco", "Cascadia Code", monospace',
                          fontSize: '0.875rem',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          '&::-webkit-scrollbar': { width: 8, height: 8 },
                          '&::-webkit-scrollbar-track': {
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: 4,
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: 4,
                          },
                          '& mark': {
                            transition: 'all 0.2s ease',
                            borderRadius: '3px',
                          },
                        }}
                      >
                        {renderTextWithLinksAndHighlights()}
                      </Box>
                    )}
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: 380,
                minWidth: 380,
                maxWidth: 420,
                p: 2,
                pl: 0,
                overflow: 'hidden',
              }}
            >
              <LinkedFileTextPanel
                file={linkedFile}
                containerId={containerId}
                allFiles={allFiles}
                title="Linked file"
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            p: 2,
            background: 'rgba(0,0,0,0.1)',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Links to referenced files open in the right panel
          </Typography>
          <Stack direction="row" spacing={1.5}>
            {isEditing ? (
              <>
                <Button onClick={handleEditToggle} variant="outlined">
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  startIcon={<SaveIcon />}
                  disabled={deleteFileMutation.isPending || uploadFileMutation.isPending}
                >
                  {deleteFileMutation.isPending || uploadFileMutation.isPending ? (
                    <CircularProgress size={18} sx={{ color: 'white' }} />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>
                Close
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            minWidth: 180,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setActionMenuAnchor(null);
            handleDownload();
          }}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1.5 }} />
          Download File
        </MenuItem>

        {isTextFile && (
          <MenuItem
            onClick={() => {
              setActionMenuAnchor(null);
              handleCopyContent();
            }}
          >
            <ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />
            Copy Content
          </MenuItem>
        )}

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => {
            setActionMenuAnchor(null);
            setShowDeleteConfirm(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete File
        </MenuItem>
      </Menu>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Delete File</Typography>
          </Stack>
          <Typography>
            Are you sure you want to permanently delete <strong>{file?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </Box>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setShowDeleteConfirm(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowDeleteConfirm(false);
              handleDelete();
            }}
            color="error"
            variant="contained"
            disabled={deleteFileMutation.isPending}
          >
            {deleteFileMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

interface GraphNode {
  id: string;
  path: string;
  name: string;
  file: ApiFile | null;
  degree: number;
  radius: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  bidirectional: boolean;
}

const SemanticGraphCanvas: React.FC<{
  files: ApiFile[];
  graphData?: SemanticGraphData;
  semanticResults: SearchResultFile[];
  isSemanticSearch: boolean;
  recommendations: RecommendationFile[];
  onOpenFile: (file: ApiFile) => void;
}> = ({ files, graphData, semanticResults, isSemanticSearch, recommendations, onOpenFile }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragNodeIdRef = useRef<string | null>(null);
  const hoverNodeIdRef = useRef<string | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  // Фиксированный размер виртуального холста
  const WORLD_SIZE = 8000; // Увеличил размер мира
  const WORLD_CENTER = WORLD_SIZE / 2;

  const graph = useMemo(() => {
    const normalized = normalizeGraph(files, graphData);
    const nodes = normalized.nodes as GraphNode[];
    const edges = normalized.edges as GraphEdge[];
    return { nodes, edges };
  }, [files, graphData]);

  const semanticMap = useMemo(() => {
    const map = new Map<string, number>();
    semanticResults.forEach((f) => {
      map.set(f.path, f.score || 0);
      map.set(f.name, f.score || 0);
    });
    return map;
  }, [semanticResults]);

  const recommendationSet = useMemo(() => new Set(recommendations.map((r) => r.path)), [recommendations]);

  // Инициализация позиций узлов с лучшим распределением
  useEffect(() => {
    const nodes = graph.nodes;
    if (nodes.length === 0) return;

    const needsInit = nodes.some(node => typeof node.x !== 'number' || typeof node.y !== 'number');
    if (!needsInit) return;

    // Используем круговое расположение для лучшего начального распределения
    const radius = Math.min(WORLD_SIZE * 0.4, Math.max(300, nodes.length * 3));
    const center = WORLD_CENTER;
    
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2;
      // Добавляем случайное смещение для более естественного вида
      const randomOffset = 50 * (Math.random() - 0.5);
      node.x = center + Math.cos(angle) * radius + randomOffset;
      node.y = center + Math.sin(angle) * radius + randomOffset;
      node.vx = 0;
      node.vy = 0;
    });
  }, [graph.nodes]);

  // Обновление размера canvas
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Анимация и отрисовка с улучшенной физикой
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = graph.nodes;
    const edges = graph.edges;
    
    if (nodes.length === 0) return;

    const tick = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      if (width === 0 || height === 0) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      // Параметры физики
      const CENTER_FORCE = 0.00005; // Уменьшил притяжение к центру
      const REPULSION_FORCE = 5042.5; // Увеличил силу отталкивания
      const EDGE_FORCE = 0.002; // Увеличил силу притяжения по ребрам
      const DAMPING = 0.85; // Уменьшил damping для более плавного движения
      const DESIRED_DISTANCE = 420; // Желаемое расстояние между связанными узлами
      const MIN_DISTANCE = 1000; // Минимальное расстояние между узлами

      // 1. Отталкивание между всеми узлами (силы Кулона)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = (a.x || 0) - (b.x || 0);
          const dy = (a.y || 0) - (b.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Сила отталкивания обратно пропорциональна расстоянию
          const force = REPULSION_FORCE / (dist * 0.5);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          a.vx = (a.vx || 0) + fx;
          a.vy = (a.vy || 0) + fy;
          b.vx = (b.vx || 0) - fx;
          b.vy = (b.vy || 0) - fy;
        }
      }

      // 2. Притяжение по ребрам (пружины)
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        const dx = (target.x || 0) - (source.x || 0);
        const dy = (target.y || 0) - (source.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Сила притяжения пропорциональна отклонению от желаемого расстояния
        const diff = dist - DESIRED_DISTANCE;
        const force = diff * EDGE_FORCE;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (dragNodeIdRef.current !== source.id) {
          source.vx = (source.vx || 0) + fx;
          source.vy = (source.vy || 0) + fy;
        }
        if (dragNodeIdRef.current !== target.id) {
          target.vx = (target.vx || 0) - fx;
          target.vy = (target.vy || 0) - fy;
        }
      });

      // 3. Слабое притяжение к центру (чтобы граф не улетал)
      nodes.forEach((node) => {
        if (dragNodeIdRef.current === node.id) return;
        
        const dx = WORLD_CENTER - (node.x || 0);
        const dy = WORLD_CENTER - (node.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 100) {
          const force = CENTER_FORCE * dist;
          node.vx = (node.vx || 0) + dx * force;
          node.vy = (node.vy || 0) + dy * force;
        }
      });

      // 4. Применение阻尼 и обновление позиций
      nodes.forEach((node) => {
        if (dragNodeIdRef.current === node.id) return;
        
        // Применяем damping
        node.vx = (node.vx || 0) * DAMPING;
        node.vy = (node.vy || 0) * DAMPING;
        
        // Обновляем позицию
        node.x = (node.x || 0) + (node.vx || 0);
        node.y = (node.y || 0) + (node.vy || 0);
        
        // Ограничение в пределах мира с отражением от границ
        const margin = 100;
        if (node.x < margin) {
          node.x = margin;
          node.vx = Math.abs(node.vx || 0) * 0.5;
        }
        if (node.x > WORLD_SIZE - margin) {
          node.x = WORLD_SIZE - margin;
          node.vx = -Math.abs(node.vx || 0) * 0.5;
        }
        if (node.y < margin) {
          node.y = margin;
          node.vy = Math.abs(node.vy || 0) * 0.5;
        }
        if (node.y > WORLD_SIZE - margin) {
          node.y = WORLD_SIZE - margin;
          node.vy = -Math.abs(node.vy || 0) * 0.5;
        }
      });

      // Отрисовка
      ctx.clearRect(0, 0, width, height);
      
      // Рисуем фон с градиентом для лучшей видимости
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0a0a0a');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const transformPoint = (x: number, y: number) => ({
        x: (x - WORLD_CENTER) * zoomRef.current + width / 2 + panRef.current.x,
        y: (y - WORLD_CENTER) * zoomRef.current + height / 2 + panRef.current.y,
      });

      // Рисуем ребра с градиентом по весу
      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;

        const p1 = transformPoint(source.x || 0, source.y || 0);
        const p2 = transformPoint(target.x || 0, target.y || 0);
        
        if (p1.x < -100 && p2.x < -100) return;
        if (p1.x > width + 100 && p2.x > width + 100) return;
        if (p1.y < -100 && p2.y < -100) return;
        if (p1.y > height + 100 && p2.y > height + 100) return;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        
        // Цвет ребра зависит от веса
        const intensity = Math.min(0.8, 0.3 + (edge.weight || 1) * 0.3);
        ctx.strokeStyle = `rgba(100, 150, 255, ${intensity})`;
        ctx.lineWidth = Math.max(1, Math.min(4, (edge.weight || 1) * 2));
        ctx.stroke();
        
        // Добавляем стрелку для направления (опционально)
        if (edge.weight > 0.8 && !edge.bidirectional) {
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const arrowSize = 8;
          const arrowX = p2.x - arrowSize * Math.cos(angle);
          const arrowY = p2.y - arrowSize * Math.sin(angle);
          
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - arrowSize * Math.sin(angle), arrowY + arrowSize * Math.cos(angle));
          ctx.lineTo(arrowX + arrowSize * Math.sin(angle), arrowY - arrowSize * Math.cos(angle));
          ctx.fillStyle = `rgba(100, 150, 255, ${intensity})`;
          ctx.fill();
        }
      });

      // Рисуем узлы
      nodes.forEach((node) => {
        const p = transformPoint(node.x || 0, node.y || 0);
        
        if (p.x < -100 || p.x > width + 100 || p.y < -100 || p.y > height + 100) return;
        
        // Радиус зависит от степени узла и зума
        const baseRadius = Math.min(24, Math.max(8, node.radius * 0.8));
        const radius = baseRadius * (zoomRef.current > 0.5 ? zoomRef.current : 0.6);
        
        const semanticScore = semanticMap.get(node.path) || semanticMap.get(node.name);
        const isSemanticSelected = isSemanticSearch && semanticScore !== undefined;
        const isRecommended = recommendationSet.has(node.path);
        
        // Выбор цвета узла
        let fill = '#6c6c6c';
        let glowColor = '';
        if (isRecommended) {
          fill = '#ff9800';
          glowColor = '#ff9800';
        }
        if (isSemanticSelected) {
          fill = '#22c55e';
          glowColor = '#22c55e';
        }
        
        // Рисуем свечение для выделенных узлов
        if (glowColor && node.id === hoverNodeIdRef.current) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 20;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        
        // Сбрасываем тень
        ctx.shadowBlur = 0;
        
        // Рисуем обводку
        ctx.strokeStyle = node.id === hoverNodeIdRef.current ? '#ffffff' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = node.id === hoverNodeIdRef.current ? 2.5 : 1.5;
        ctx.stroke();
        
        // Рисуем текст, если достаточно места
        if (radius > 14) {
          ctx.fillStyle = '#ffffff';
          const fontSize = Math.max(10, Math.min(12, radius * 0.6));
          ctx.font = `${fontSize}px "Segoe UI", "Roboto", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          let label = node.name;
          const maxChars = Math.floor(radius * 1.5);
          if (label.length > maxChars) {
            label = label.slice(0, maxChars - 2) + '…';
          }
          ctx.fillText(label, p.x, p.y);
        }
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [graph, semanticMap, recommendationSet, isSemanticSearch]);

  const getCanvasPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const worldX = (x - canvas.width / 2 - panRef.current.x) / zoomRef.current + WORLD_CENTER;
    const worldY = (y - canvas.height / 2 - panRef.current.y) / zoomRef.current + WORLD_CENTER;
    
    return { x: worldX, y: worldY };
  }, []);

  const hitTest = useCallback(
    (x: number, y: number) => {
      for (let i = graph.nodes.length - 1; i >= 0; i--) {
        const node = graph.nodes[i];
        const dx = x - (node.x || 0);
        const dy = y - (node.y || 0);
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius) return node;
      }
      return null;
    },
    [graph.nodes]
  );

  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        flex: 1,
        minHeight: 540,
        backgroundColor: '#000',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <canvas
        ref={canvasRef}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          zoomRef.current = Math.max(0.3, Math.min(2, zoomRef.current * delta));
        }}
        onMouseDown={(e) => {
          const p = getCanvasPoint(e);
          const node = hitTest(p.x, p.y);
          if (node) {
            dragNodeIdRef.current = node.id;
          } else {
            isPanningRef.current = true;
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onMouseMove={(e) => {
          const p = getCanvasPoint(e);
          const node = hitTest(p.x, p.y);

          hoverNodeIdRef.current = node?.id || null;
          setHoveredNode(node || null);

          if (dragNodeIdRef.current) {
            const dragged = graph.nodes.find((n) => n.id === dragNodeIdRef.current);
            if (dragged) {
              dragged.x = p.x;
              dragged.y = p.y;
              dragged.vx = 0;
              dragged.vy = 0;
            }
          } else if (isPanningRef.current) {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;
            panRef.current.x += dx;
            panRef.current.y += dy;
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onMouseUp={() => {
          dragNodeIdRef.current = null;
          isPanningRef.current = false;
        }}
        onMouseLeave={() => {
          dragNodeIdRef.current = null;
          isPanningRef.current = false;
          hoverNodeIdRef.current = null;
          setHoveredNode(null);
        }}
        onDoubleClick={(e) => {
          const p = getCanvasPoint(e);
          const node = hitTest(p.x, p.y);
          if (node?.file) onOpenFile(node.file);
        }}
        onClick={(e) => {
          const p = getCanvasPoint(e);
          const node = hitTest(p.x, p.y);
          if (node?.file) onOpenFile(node.file);
        }}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: dragNodeIdRef.current ? 'grabbing' : hoveredNode ? 'pointer' : 'grab',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          display: 'flex',
          gap: 1,
          zIndex: 2,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 2,
          p: 0.5,
        }}
      >
        <IconButton
          size="small"
          onClick={() => {
            zoomRef.current = Math.max(0.3, zoomRef.current * 0.9);
          }}
          sx={{ color: 'white' }}
        >
          <NavigateBeforeIcon />
        </IconButton>
        <Typography variant="caption" sx={{ color: 'white', alignSelf: 'center', minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoomRef.current * 100)}%
        </Typography>
        <IconButton
          size="small"
          onClick={() => {
            zoomRef.current = Math.min(2, zoomRef.current * 1.1);
          }}
          sx={{ color: 'white' }}
        >
          <NavigateNextIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          zIndex: 2,
        }}
      >
        <Chip label="Gray: files" size="small" sx={{ backgroundColor: '#8a8a8a', color: '#fff' }} />
        <Chip label="Green: semantic search" size="small" sx={{ backgroundColor: '#22c55e', color: '#fff' }} />
        <Chip label="Orange: recommendations" size="small" sx={{ backgroundColor: '#ff9800', color: '#000' }} />
      </Box>

      {hoveredNode && (
        <Paper
          elevation={6}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            p: 1.5,
            minWidth: 220,
            maxWidth: 320,
            background: 'rgba(18,18,18,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            zIndex: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {hoveredNode.name}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', wordBreak: 'break-word' }}>
            {hoveredNode.path}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
            <Chip label={`${hoveredNode.degree} edges`} size="small" variant="outlined" />
            {hoveredNode.file && <Chip label={formatFileSize(hoveredNode.file.size)} size="small" variant="outlined" />}
            {semanticMap.has(hoveredNode.path) && (
              <Chip
                label={`Similarity ${(semanticMap.get(hoveredNode.path) || 0).toFixed(2)}`}
                size="small"
                sx={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
              />
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

interface FilesViewProps {
  containerId: string;
}

export default function FilesView({ containerId }: FilesViewProps) {
  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useFiles(containerId);
  const { data: graphData } = useGetSemanticGraph(containerId);
  const { addNotification, notification, closeNotification } = useNotifications();
  const semanticSearchMutation = useSemanticSearch();

  const { paths: recommendedPaths } = useRecommendationsStream(
    containerId,
    (newPaths) => {
      addNotification({
        message: `Found ${newPaths.length} recommended files`,
        severity: 'info',
        open: true,
      });
    },
    (finalPaths) => {
      addNotification({
        message: `Recommendations completed: ${finalPaths.length} files`,
        severity: 'success',
        open: true,
      });
    }
  );

  const [fileContentDialog, setFileContentDialog] = useState<{
    open: boolean;
    file: ApiFile | null;
    currentIndex: number;
  }>({
    open: false,
    file: null,
    currentIndex: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [rebuildNotification, setRebuildNotification] = useState<{
    open: boolean;
    message: string;
    severity: Severity;
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const recommendationFiles: RecommendationFile[] = recommendedPaths.map((path) => ({
    path,
    name: path.split('/').pop() || 'unknown',
    isRecommended: true,
  }));

  const currentFilesList = useMemo(() => {
    if (isSemanticSearch) return [...searchResults].reverse();
    if (!searchQuery) return [...files].reverse();
    return [...files]
      .filter(
        (file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.mime_type.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .reverse();
  }, [isSemanticSearch, searchResults, searchQuery, files]);

  const handleSemanticSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !containerId) return;

      setIsSearching(true);
      setIsSemanticSearch(true);

      try {
        const result: any = await semanticSearchMutation.mutateAsync({
          query,
          container_id: containerId,
          limit: 50,
        });

        const resultFiles: SearchResultFile[] = (result.results || [])
          .filter((searchResult: any) => searchResult.scope !== undefined)
          .map((searchResult: any) => {
            const existing = files.find((f) => f.path === searchResult.path || f.name === searchResult.path);
            return {
              path: existing?.path || searchResult.path,
              name: existing?.name || searchResult.path.split('/').pop() || 'unknown',
              size: existing?.size || 0,
              container_id: containerId,
              user_id: existing?.user_id || '',
              created_at: existing?.created_at || new Date().toISOString(),
              mime_type: existing?.mime_type || 'text/plain',
              score: searchResult.scope,
              content_preview: `Score: ${searchResult.scope.toFixed(2)}`,
            };
          })
          .filter((file: { name: string; }) => !['container_config.json', 'access_policy.json'].includes(file.name));

        setSearchResults(resultFiles);

        addNotification({
          message: `Found ${resultFiles.length} semantically relevant files`,
          severity: 'success',
          open: true,
        });
      } catch (error) {
        addNotification({
          message: `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
          open: true,
        });
        setIsSemanticSearch(false);
      } finally {
        setIsSearching(false);
      }
    },
    [containerId, semanticSearchMutation, addNotification, files]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setIsSemanticSearch(false);
      setSearchResults([]);
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim() && containerId) {
      handleSemanticSearch(searchQuery);
    }
  }, [searchQuery, containerId, handleSemanticSearch]);

  const handleRefreshFiles = useCallback(async () => {
    if (!containerId) return;

    setIsRebuildingIndex(true);

    try {
      const result = await apiClient.getFilesRebuildIndex(containerId);
      refetchFiles();

      setRebuildNotification({
        open: true,
        message: `File index rebuilt successfully. Found ${result.length} files.`,
        severity: 'success',
      });

      addNotification({
        message: `File index rebuilt. ${result.length} files found.`,
        severity: 'success',
        open: true,
      });
    } catch (error) {
      setRebuildNotification({
        open: true,
        message: `Failed to rebuild index: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });

      addNotification({
        message: 'Failed to rebuild file index',
        severity: 'error',
        open: true,
      });

      refetchFiles();
    } finally {
      setIsRebuildingIndex(false);
    }
  }, [containerId, refetchFiles, addNotification]);

  const openFile = useCallback(
    (file: ApiFile) => {
      const fileIndex = currentFilesList.findIndex((f) => f.path === file.path || f.name === file.name);
      setFileContentDialog({
        open: true,
        file,
        currentIndex: fileIndex >= 0 ? fileIndex : 0,
      });
    },
    [currentFilesList]
  );

  const handleCloseFileContent = useCallback(() => {
    setFileContentDialog({ open: false, file: null, currentIndex: 0 });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSemanticSearch(false);
    setSearchResults([]);
  }, []);

  const handleRecommendationClick = useCallback(
    (recommendation: RecommendationFile) => {
      const existing = files.find((f) => f.path === recommendation.path || f.name === recommendation.name);
      const recommendedFile: ApiFile =
        existing || {
          path: recommendation.path,
          name: recommendation.name,
          size: 0,
          container_id: containerId,
          user_id: '',
          created_at: new Date().toISOString(),
          mime_type: 'text/plain',
        };
      openFile(recommendedFile);
    },
    [containerId, openFile, files]
  );

  const handleNextFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    const nextIndex = (fileContentDialog.currentIndex + 1) % currentFilesList.length;
    setFileContentDialog({
      open: true,
      file: currentFilesList[nextIndex],
      currentIndex: nextIndex,
    });
  }, [fileContentDialog, currentFilesList]);

  const handlePrevFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    const prevIndex =
      fileContentDialog.currentIndex > 0 ? fileContentDialog.currentIndex - 1 : currentFilesList.length - 1;
    setFileContentDialog({
      open: true,
      file: currentFilesList[prevIndex],
      currentIndex: prevIndex,
    });
  }, [fileContentDialog, currentFilesList]);

  useEffect(() => {
    if (recommendationFiles.length > 0) {
      setShowRecommendations(true);
    }
  }, [recommendationFiles.length]);

  if (!containerId) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          textAlign: 'center',
        }}
      >
        <DescriptionIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
        <Typography variant="h4" color="text.secondary" gutterBottom sx={{ fontWeight: 300 }}>
          No Container Selected
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
          Please select a container from the sidebar to view and manage its files
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box
        sx={{
          mb: 2,
          p: 2,
          background: 'linear-gradient(135deg, rgba(115, 103, 240, 0.05) 0%, rgba(115, 103, 240, 0.02) 100%)',
          borderRadius: 3,
          border: '1px solid rgba(115, 103, 240, 0.1)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, position: 'relative' }}>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            sx={{ flex: 1, position: 'relative' }}
          >
            <TextField
              fullWidth
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="Semantic search files..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SemanticSearchIcon
                      sx={{
                        color: isSearchFocused ? 'primary.main' : 'text.secondary',
                        transition: 'color 0.2s ease',
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {searchQuery && (
                        <IconButton size="small" onClick={handleClearSearch} sx={{ opacity: 0.6 }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Button
                        variant="contained"
                        onClick={handleSearchSubmit}
                        disabled={!searchQuery.trim() || isSearching}
                        size="small"
                        sx={{ minWidth: 80, height: 32 }}
                      >
                        {isSearching ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Search'}
                      </Button>
                    </Stack>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                },
              }}
            />

            <Fade in={isSearchFocused && searchQuery.length === 0}>
              <Paper
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  p: 2.5,
                  borderRadius: 2,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  zIndex: 1000,
                  background: 'rgba(26, 31, 54, 0.98)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, fontWeight: 500 }}>
                  AI-Powered Semantic Search
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Find files by meaning and context
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {SEARCH_SUGGESTIONS.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleSemanticSearch(suggestion);
                      }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Fade>
          </Box>

          <Button variant="outlined" startIcon={<TuneIcon />} onClick={(e) => setToolsMenuAnchor(e.currentTarget)}>
            Tools
          </Button>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {isSemanticSearch && (
              <Chip
                icon={<SemanticSearchIcon />}
                label="Semantic Search Active"
                size="small"
                color="primary"
                variant="filled"
              />
            )}
            <Typography variant="body2" color="text.secondary">
              {isSemanticSearch ? `${searchResults.length} relevant files found` : `${files.length} files`}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {recommendationFiles.length > 0 && (
              <Button
                variant="text"
                size="small"
                startIcon={
                  <Badge badgeContent={recommendationFiles.length} color="primary">
                    <AutoAwesomeIcon />
                  </Badge>
                }
                onClick={() => setShowRecommendations((prev) => !prev)}
              >
                AI Recommendations
              </Button>
            )}
            <Chip icon={<HubIcon />} label="Semantic graph" size="small" variant="outlined" />
            <Chip icon={<FileIcon />} label={`${files.length} indexed`} size="small" variant="outlined" />
          </Stack>
        </Stack>
      </Box>

      <Collapse in={showRecommendations && recommendationFiles.length > 0}>
        <Card
          sx={{
            mb: 2,
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)',
            border: '1px solid rgba(255, 193, 7, 0.2)',
            flexShrink: 0,
          }}
        >
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AutoAwesomeIcon sx={{ color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Recommendations
                </Typography>
                <Chip
                  size="small"
                  label={`${recommendationFiles.length} files`}
                  sx={{ backgroundColor: 'warning.main', color: 'black', fontWeight: 500 }}
                />
              </Stack>
              <IconButton size="small" onClick={() => setShowRecommendations(false)} sx={{ opacity: 0.7 }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {recommendationFiles.slice(0, 8).map((rec, index) => (
                <Chip
                  key={`${rec.path}-${index}`}
                  label={rec.name}
                  clickable
                  onClick={() => handleRecommendationClick(rec)}
                  variant="outlined"
                  sx={{
                    borderColor: 'warning.main',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    },
                  }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Collapse>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {isLoadingFiles ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : files.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '40vh',
              textAlign: 'center',
            }}
          >
            <DescriptionIcon sx={{ fontSize: 96, color: 'text.secondary', mb: 3, opacity: 0.3 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 300 }}>
              No Files Available
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
              This container doesn&apos;t have any files yet. Try rebuilding the index or uploading files.
            </Typography>
            <Button variant="contained" onClick={handleRefreshFiles} startIcon={<RefreshIcon />} disabled={isRebuildingIndex}>
              {isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}
            </Button>
          </Box>
        ) : (
          <SemanticGraphCanvas
            files={files}
            graphData={graphData}
            semanticResults={searchResults}
            isSemanticSearch={isSemanticSearch}
            recommendations={recommendationFiles}
            onOpenFile={openFile}
          />
        )}
      </Box>

      <Menu
        anchorEl={toolsMenuAnchor}
        open={Boolean(toolsMenuAnchor)}
        onClose={() => setToolsMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(26, 31, 54, 0.98)',
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setToolsMenuAnchor(null);
            handleRefreshFiles();
          }}
          disabled={isRebuildingIndex}
        >
          <RefreshIcon sx={{ mr: 1, fontSize: 20 }} />
          {isRebuildingIndex ? 'Rebuilding Index...' : 'Rebuild Index'}
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem
          onClick={() => {
            setToolsMenuAnchor(null);
            setShowRecommendations(true);
          }}
          disabled={recommendationFiles.length === 0}
        >
          <AutoAwesomeIcon sx={{ mr: 1, fontSize: 20 }} />
          Show Recommendations
        </MenuItem>
      </Menu>

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

      <Snackbar
        open={rebuildNotification.open}
        autoHideDuration={6000}
        onClose={() => setRebuildNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={rebuildNotification.severity}
          onClose={() => setRebuildNotification((prev) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {rebuildNotification.message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={notification.severity} onClose={closeNotification} variant="filled" sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}