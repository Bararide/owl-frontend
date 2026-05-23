import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Typography,
  IconButton,
  Fade,
  Chip,
  CircularProgress,
  Tooltip,
  Alert,
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
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Description as DescriptionIcon,
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
  FolderSpecial as FolderSpecialIcon,
  AutoAwesome as AutoAwesomeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { apiClient } from "../../api/client";
import type { ApiFile, Group } from "../../api/client";
import {
  useDeleteFile,
  useFileContent,
  useUploadFile,
  useNotifications,
  useFileGroups,
} from "../../hooks/useApi";
import { ExplanationPanel } from "./ExplanationPanel";
import { formatFileSize, getLanguageFromMimeType } from "./utils";
import { HIGHLIGHT_COLORS } from "./constants";
import type { FileContentDialogProps, SearchMatch } from "./types";
import { MarkdownRenderer } from "./MarkdownRenderer";

const isMarkdownFile = (filename: string): boolean => {
  return filename.endsWith('.md') ||
    filename.endsWith('.markdown') ||
    filename.endsWith('.mdown') ||
    filename.endsWith('.mkd');
};

const isLatexFile = (filename: string): boolean => {
  return filename.endsWith('.tex') ||
    filename.endsWith('.latex');
};

const shouldRenderAsMarkdown = (filename: string, mimeType: string, content?: string): boolean => {
  if (isMarkdownFile(filename) || mimeType === 'text/markdown') return true;
  if (isLatexFile(filename) && content?.includes('\\(')) return true;
  return false;
};

export const FileContentDialog: React.FC<FileContentDialogProps> = ({
  open,
  onClose,
  file,
  containerId,
  allFiles,
  onFileUpdated,
  onFileDeleted,
  searchQuery: initialSearchQuery = "",
  currentFileIndex = 0,
  totalFiles = 0,
  onNextFile,
  onPrevFile,
  containerGroups = [],
  onAddToGroup,
  onRemoveFromGroup,
}) => {
  const { data, isLoading, error, refetch } = useFileContent(
    containerId,
    file?.name || "",
  );
  const { data: fileGroups, refetch: refetchFileGroups } = useFileGroups(
    file?.name,
  );
  const deleteFileMutation = useDeleteFile();
  const uploadFileMutation = useUploadFile();
  const { addNotification } = useNotifications();
  const content = data?.content || "";
  const explanation = data?.explanation || "";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saveError, setSaveError] = useState("");
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [renderMode, setRenderMode] = useState<'raw' | 'rendered'>('rendered');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isTextFile =
    file?.mime_type?.startsWith("text/") ||
    file?.mime_type === "application/json";

  const parseSearchQuery = useMemo(
    () => searchQuery.trim().split(/\s+/).filter(Boolean),
    [searchQuery],
  );

  const findSearchMatches = useMemo(() => {
    if (!searchQuery.trim() || !editedContent || parseSearchQuery.length === 0)
      return [];
    const matches: SearchMatch[] = [];
    const content = matchCase ? editedContent : editedContent.toLowerCase();
    parseSearchQuery.forEach((word, wordIndex) => {
      const searchTerm = matchCase ? word : word.toLowerCase();
      const positions: number[] = [];
      if (wholeWord) {
        const regex = new RegExp(
          `\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          matchCase ? "g" : "gi",
        );
        let match;
        while ((match = regex.exec(editedContent)) !== null)
          positions.push(match.index);
      } else {
        let position = content.indexOf(searchTerm);
        while (position !== -1) {
          positions.push(position);
          position = content.indexOf(searchTerm, position + 1);
        }
      }
      if (positions.length > 0)
        matches.push({
          word,
          positions,
          color: HIGHLIGHT_COLORS[wordIndex % HIGHLIGHT_COLORS.length],
        });
    });
    return matches;
  }, [editedContent, searchQuery, parseSearchQuery, matchCase, wholeWord]);

  const totalMatches = useMemo(
    () => searchMatches.reduce((sum, m) => sum + m.positions.length, 0),
    [searchMatches],
  );

  useEffect(() => {
    if (file?.name && open) {
      setIsEditing(false);
      setEditedContent("");
      setSaveError("");
      setGroupMenuAnchor(null);
      setShowDeleteConfirm(false);
      setSearchQuery(initialSearchQuery);
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(!!initialSearchQuery);
      setCopied(false);
      setMatchCase(false);
      setWholeWord(false);
      setRenderMode('rendered');
      setShowSearchBar(false);
      setTimeout(() => {
        refetch();
        refetchFileGroups();
      }, 100);
    }
  }, [file?.name, initialSearchQuery, open, refetch, refetchFileGroups]);

  useEffect(() => {
    if (data?.content && !editedContent) setEditedContent(data.content);
  }, [data, editedContent]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedContent("");
      setSaveError("");
      setGroupMenuAnchor(null);
      setShowDeleteConfirm(false);
      setSearchQuery("");
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(false);
      setCopied(false);
      setMatchCase(false);
      setWholeWord(false);
      setRenderMode('rendered');
      setShowSearchBar(false);
    }
  }, [open]);

  useEffect(() => {
    const matches = findSearchMatches;
    setSearchMatches(matches);
    setCurrentMatchIndex(
      matches.length > 0 && matches[0].positions.length > 0 ? 0 : -1,
    );
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
    if (currentMatchIndex >= 0 && currentMatchIndex < ranges.length)
      ranges[currentMatchIndex].isCurrent = true;
    return ranges;
  }, [searchMatches, currentMatchIndex]);

  useEffect(() => {
    if (currentMatchIndex < 0 || !contentScrollRef.current) return;
    const marks = contentScrollRef.current.querySelectorAll(
      '[data-current-match="true"]',
    );
    const current = marks[0] as HTMLElement | undefined;
    if (current)
      current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentMatchIndex, flattenRanges]);

  useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchBar]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchActive(!!e.target.value.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setIsSearchActive(false);
    setShowSearchBar(false);
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
        message: "Content copied to clipboard",
        severity: "success",
        open: true,
      });
    } catch {
      addNotification({
        message: "Failed to copy content",
        severity: "error",
        open: true,
      });
    }
  }, [editedContent, addNotification]);

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
    setSaveError("");
  };

  const handleSave = useCallback(async () => {
    if (!file || !containerId) return;
    setSaveError("");
    try {
      const blob = new Blob([editedContent], {
        type: file.mime_type || "text/plain",
      });
      const newFile = new File([blob], file.name, {
        type: file.mime_type || "text/plain",
        lastModified: Date.now(),
      });
      await deleteFileMutation.mutateAsync({ fileId: file.name, containerId });
      await uploadFileMutation.mutateAsync({ containerId, file: newFile });
      addNotification({
        message: `File "${file.name}" updated successfully`,
        severity: "success",
        open: true,
      });
      setIsEditing(false);
      onFileUpdated?.();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save file";
      setSaveError(errorMessage);
      addNotification({ message: errorMessage, severity: "error", open: true });
    }
  }, [
    file,
    containerId,
    editedContent,
    deleteFileMutation,
    uploadFileMutation,
    addNotification,
    onFileUpdated,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!file || !containerId) return;
    try {
      await deleteFileMutation.mutateAsync({ fileId: file.name, containerId });
      addNotification({
        message: `File "${file.name}" deleted successfully`,
        severity: "success",
        open: true,
      });
      onClose();
      onFileDeleted?.();
    } catch (error) {
      addNotification({
        message: `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
        open: true,
      });
    }
  }, [
    file,
    containerId,
    deleteFileMutation,
    addNotification,
    onClose,
    onFileDeleted,
  ]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      const blob = await apiClient.downloadFile(file.name, containerId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({
        message: `File "${file.name}" downloaded`,
        severity: "success",
        open: true,
      });
    } catch (error) {
      addNotification({
        message: `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
        open: true,
      });
    }
  }, [file, containerId, addNotification]);

  const handleAddToGroup = async (groupId: string) => {
    if (!file) return;
    try {
      if (onAddToGroup) {
        await onAddToGroup(groupId, file.name);
      }
      addNotification({
        message: "File added to group",
        severity: "success",
        open: true,
      });
      refetchFileGroups();
    } catch {
      addNotification({
        message: "Failed to add file to group",
        severity: "error",
        open: true,
      });
    }
    setGroupMenuAnchor(null);
  };

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!file) return;
    try {
      if (onRemoveFromGroup) {
        await onRemoveFromGroup(groupId, file.name);
      }
      addNotification({
        message: "File removed from group",
        severity: "success",
        open: true,
      });
      refetchFileGroups();
    } catch {
      addNotification({
        message: "Failed to remove file from group",
        severity: "error",
        open: true,
      });
    }
  };

  const handleToggleRenderMode = () => {
    setRenderMode(prev => prev === 'rendered' ? 'raw' : 'rendered');
  };

  const renderTextWithHighlights = () => {
    if (!editedContent) return null;
    if (flattenRanges.length === 0) return editedContent;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    flattenRanges.forEach((range, index) => {
      if (range.start > lastIndex)
        parts.push(
          <span key={`text-${index}`}>
            {editedContent.slice(lastIndex, range.start)}
          </span>,
        );
      parts.push(
        <mark
          key={`highlight-${index}`}
          data-current-match={range.isCurrent ? "true" : "false"}
          style={{
            backgroundColor: range.color,
            color: "inherit",
            padding: "0 2px",
            borderRadius: "3px",
            fontWeight: range.isCurrent ? "bold" : "normal",
            border: range.isCurrent ? "2px solid #ff9800" : "none",
            boxShadow: range.isCurrent
              ? "0 0 8px rgba(255, 152, 0, 0.5)"
              : "none",
            transition: "all 0.2s ease",
          }}
        >
          {editedContent.slice(range.start, range.end)}
        </mark>,
      );
      lastIndex = range.end;
    });
    if (lastIndex < editedContent.length)
      parts.push(<span key="text-last">{editedContent.slice(lastIndex)}</span>);
    return parts;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && isEditing) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        setIsEditing(false);
        setEditedContent(data?.content || "");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && !isEditing) {
        e.preventDefault();
        setShowSearchBar(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, isEditing, handleSave, data]);

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
            background: "linear-gradient(135deg, rgba(26, 31, 54, 0.98) 0%, rgba(26, 31, 54, 0.95) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            width: "96vw",
            height: "92vh",
            maxWidth: "96vw",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 10, display: "flex", gap: 1 }}>
            {totalFiles > 1 && (
              <>
                <Tooltip title="Previous file">
                  <IconButton onClick={onPrevFile} size="small" sx={{ bgcolor: "rgba(0,0,0,0.5)", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}>
                    <ChevronLeftIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Next file">
                  <IconButton onClick={onNextFile} size="small" sx={{ bgcolor: "rgba(0,0,0,0.5)", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}>
                    <ChevronRightIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>

          <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", gap: 1 }}>
            <Tooltip title="Close (Esc)">
              <IconButton onClick={onClose} size="small" sx={{ bgcolor: "rgba(0,0,0,0.5)", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Box sx={{ position: "relative", width: 56, borderRight: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center", py: 2, gap: 1, flexShrink: 0 }}>
              <Tooltip title={isEditing ? "Cancel Edit" : "Edit file"} placement="right">
                <IconButton onClick={handleEditToggle} size="small" sx={{ color: isEditing ? "#ff9800" : "rgba(255,255,255,0.7)" }}>
                  <EditIcon />
                </IconButton>
              </Tooltip>

              {isTextFile && !isEditing && (
                <Tooltip title="Search (Ctrl+F)" placement="right">
                  <IconButton onClick={() => setShowSearchBar(true)} size="small" sx={{ color: showSearchBar ? "#ff9800" : "rgba(255,255,255,0.7)" }}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
              )}

              {isTextFile && !isEditing && (
                <Tooltip title={renderMode === 'rendered' ? "Show raw content" : "Show rendered content"} placement="right">
                  <IconButton onClick={handleToggleRenderMode} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {renderMode === 'rendered' ? <CodeIcon /> : <TextFieldsIcon />}
                  </IconButton>
                </Tooltip>
              )}

              {isTextFile && !isEditing && shouldRenderAsMarkdown(file?.name || '', file?.mime_type || '', editedContent) && (
                <Tooltip title="Copy content" placement="right">
                  <IconButton onClick={handleCopyContent} size="small" sx={{ color: copied ? "#4caf50" : "rgba(255,255,255,0.7)" }}>
                    {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Download file" placement="right">
                <IconButton onClick={handleDownload} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Manage groups" placement="right">
                <IconButton onClick={(e) => setGroupMenuAnchor(e.currentTarget)} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  <FolderSpecialIcon />
                </IconButton>
              </Tooltip>

              {fileGroups && fileGroups.length > 0 && (
                <Tooltip title={`In ${fileGroups.length} group${fileGroups.length > 1 ? 's' : ''}`} placement="right">
                  <Badge badgeContent={fileGroups.length} color="primary" sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 16, minWidth: 16 } }}>
                    <IconButton size="small" disabled sx={{ opacity: 0.5 }}>
                      <FolderSpecialIcon />
                    </IconButton>
                  </Badge>
                </Tooltip>
              )}

              <Tooltip title="Delete file" placement="right">
                <IconButton onClick={() => setShowDeleteConfirm(true)} size="small" sx={{ color: "error.main", "&:hover": { color: "#f44336" } }}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <DialogContent sx={{ p: 0, flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {isTextFile && !isEditing && showSearchBar && (
                  <Fade in={showSearchBar}>
                    <Paper
                      elevation={0}
                      sx={{
                        mx: 2,
                        mt: 2,
                        mb: 1,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        flexShrink: 0,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <TextField
                          inputRef={searchInputRef}
                          size="small"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                          variant="outlined"
                          sx={{ flex: 1 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ opacity: 0.7 }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                        {searchQuery && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" sx={{ minWidth: 60 }}>
                              {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : "0 matches"}
                            </Typography>
                            <Tooltip title="Previous">
                              <IconButton size="small" onClick={handlePrevMatch} disabled={totalMatches === 0}>
                                <NavigateBeforeIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Next">
                              <IconButton size="small" onClick={handleNextMatch} disabled={totalMatches === 0}>
                                <NavigateNextIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                        <Stack direction="row" spacing={1}>
                          <FormControlLabel
                            control={<Switch size="small" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />}
                            label={<Typography variant="caption">Case</Typography>}
                          />
                          <FormControlLabel
                            control={<Switch size="small" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />}
                            label={<Typography variant="caption">Whole word</Typography>}
                          />
                        </Stack>
                        <Tooltip title="Close search">
                          <IconButton size="small" onClick={handleClearSearch}>
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  </Fade>
                )}

                <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 3 }}>
                  {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                      <Stack alignItems="center" spacing={2}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">Loading file content...</Typography>
                      </Stack>
                    </Box>
                  ) : error ? (
                    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", textAlign: "center" }}>
                      <CodeIcon sx={{ fontSize: 96, mb: 2, opacity: 0.3 }} />
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>Unable to Load File</Typography>
                      <Typography variant="body1" sx={{ maxWidth: 400 }}>
                        {error instanceof Error ? error.message : "An unknown error occurred while loading the file"}
                      </Typography>
                    </Box>
                  ) : !isTextFile ? (
                    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", textAlign: "center" }}>
                      <DescriptionIcon sx={{ fontSize: 96, mb: 3, opacity: 0.3 }} />
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>Binary File Preview</Typography>
                      <Typography variant="body1" sx={{ mb: 3, maxWidth: 400 }}>
                        This file type cannot be displayed in the text viewer. Download the file to view its contents.
                      </Typography>
                      <Button variant="contained" size="large" startIcon={<DownloadIcon />} onClick={handleDownload}>
                        Download File
                      </Button>
                    </Box>
                  ) : data && editedContent !== undefined ? (
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                          flexShrink: 0,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {file?.name}
                            </Typography>
                            <Chip
                              label={
                                shouldRenderAsMarkdown(file?.name || '', file?.mime_type || '', editedContent)
                                  ? (isLatexFile(file?.name || '') ? 'LaTeX' : 'Markdown')
                                  : getLanguageFromMimeType(file?.mime_type || "")
                              }
                              size="small"
                              color="primary"
                            />
                            {explanation && (
                              <Chip
                                icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                                label="AI Explained"
                                size="small"
                                sx={{ backgroundColor: "rgba(255, 152, 0, 0.15)", color: "#ff9800" }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(data.size)} • {editedContent.split("\n").length} lines
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
                              height: "100%",
                              "& .MuiOutlinedInput-root": { height: "100%", alignItems: "flex-start", borderRadius: 2 },
                              "& .MuiOutlinedInput-input": {
                                fontFamily: '"Fira Code", monospace',
                                fontSize: "0.875rem",
                                lineHeight: 1.6,
                                p: 3,
                                height: "100% !important",
                                overflow: "auto !important",
                              },
                            }}
                          />
                        </Box>
                      ) : shouldRenderAsMarkdown(file?.name || '', file?.mime_type || '', editedContent) && renderMode === 'rendered' ? (
                        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                          <MarkdownRenderer content={editedContent} />
                        </Box>
                      ) : (
                        <Box
                          ref={contentScrollRef}
                          sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: 3,
                            fontFamily: '"Fira Code", monospace',
                            fontSize: "0.875rem",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            "&::-webkit-scrollbar": { width: 8, height: 8 },
                            "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.05)", borderRadius: 4 },
                            "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: 4 },
                          }}
                        >
                          {renderTextWithHighlights()}
                        </Box>
                      )}
                    </Paper>
                  ) : (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                      <CircularProgress />
                    </Box>
                  )}
                </Box>
              </Box>

              {explanation && (
                <Box sx={{ display: { xs: "none", lg: "block" }, width: 380, minWidth: 380, maxWidth: 420, p: 2, pl: 0, overflow: "hidden" }}>
                  <ExplanationPanel explanation={explanation} query={initialSearchQuery} />
                </Box>
              )}
            </DialogContent>
          </Box>

          {isEditing && (
            <Box sx={{ position: "absolute", bottom: 20, right: 20, zIndex: 20, display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={handleEditToggle}>Cancel</Button>
              <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />} disabled={deleteFileMutation.isPending || uploadFileMutation.isPending}>
                {deleteFileMutation.isPending || uploadFileMutation.isPending ? <CircularProgress size={18} sx={{ color: "white" }} /> : "Save"}
              </Button>
            </Box>
          )}
        </Box>
      </Dialog>

      <Menu
        anchorEl={groupMenuAnchor}
        open={Boolean(groupMenuAnchor)}
        onClose={() => setGroupMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(26, 31, 54, 0.98)",
            backdropFilter: "blur(20px)",
            minWidth: 200,
          },
        }}
      >
        {containerGroups
          .filter((g) => !fileGroups?.some((fg: { id: string }) => fg.id === g.id))
          .map((group) => (
            <MenuItem key={group.id} onClick={() => handleAddToGroup(group.id)}>
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: group.color || "#ff9800", mr: 1.5 }} />
              {group.id}
            </MenuItem>
          ))}
        {containerGroups.filter((g) => !fileGroups?.some((fg: { id: string }) => fg.id === g.id)).length === 0 && (
          <MenuItem disabled>No available groups</MenuItem>
        )}
        {fileGroups && fileGroups.length > 0 && (
          <>
            <Divider />
            {fileGroups.map((group: Group) => (
              <MenuItem key={group.id} onClick={() => handleRemoveFromGroup(group.id)} sx={{ color: "error.main" }}>
                <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
                Remove from {group.id}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "rgba(26, 31, 54, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
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
          <Button onClick={() => setShowDeleteConfirm(false)} variant="outlined">Cancel</Button>
          <Button onClick={() => { setShowDeleteConfirm(false); handleDelete(); }} color="error" variant="contained" disabled={deleteFileMutation.isPending}>
            {deleteFileMutation.isPending ? <CircularProgress size={18} sx={{ color: "white" }} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};