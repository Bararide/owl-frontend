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
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [groupMenuAnchor, setGroupMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
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
      setActionMenuAnchor(null);
      setGroupMenuAnchor(null);
      setShowDeleteConfirm(false);
      setSearchQuery(initialSearchQuery);
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(!!initialSearchQuery);
      setCopied(false);
      setMatchCase(false);
      setWholeWord(false);
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
      setActionMenuAnchor(null);
      setGroupMenuAnchor(null);
      setShowDeleteConfirm(false);
      setSearchQuery("");
      setSearchMatches([]);
      setCurrentMatchIndex(-1);
      setIsSearchActive(false);
      setCopied(false);
      setMatchCase(false);
      setWholeWord(false);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchActive(!!e.target.value.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
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
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "s" &&
        isEditing
      ) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        setIsEditing(false);
        setEditedContent(data?.content || "");
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
            background:
              "linear-gradient(135deg, rgba(26, 31, 54, 0.98) 0%, rgba(26, 31, 54, 0.95) 100%)",
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
        <DialogContent
          sx={{
            p: 0,
            flex: 1,
            display: "flex",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: 260,
              minWidth: 260,
              maxWidth: 260,
              borderRight: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.22)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {file?.name || file?.path.split("/").pop()}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ wordBreak: "break-word" }}
                >
                  {file?.path}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={getLanguageFromMimeType(file?.mime_type || "")}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={formatFileSize(file?.size || 0)}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                {totalFiles > 1 && (
                  <Typography variant="caption" color="text.secondary">
                    File {currentFileIndex + 1} of {totalFiles}
                  </Typography>
                )}
              </Stack>
            </Box>
            <Box sx={{ p: 2, overflow: "auto" }}>
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
                      variant={copied ? "contained" : "outlined"}
                      size="small"
                      startIcon={
                        copied ? <CheckCircleIcon /> : <ContentCopyIcon />
                      }
                      onClick={handleCopyContent}
                      color={copied ? "success" : "primary"}
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      fullWidth
                      variant={isEditing ? "contained" : "outlined"}
                      size="small"
                      startIcon={<EditIcon />}
                      color={isEditing ? "warning" : "primary"}
                      onClick={handleEditToggle}
                    >
                      {isEditing ? "Cancel Edit" : "Edit"}
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
                  startIcon={<FolderSpecialIcon />}
                  onClick={(e) => setGroupMenuAnchor(e.currentTarget)}
                >
                  Groups
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
                {fileGroups && fileGroups.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Current groups:
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      flexWrap="wrap"
                      sx={{ mt: 0.5 }}
                    >
                      {fileGroups.map((group: Group) => (
                        <Chip
                          key={group.id}
                          label={group.id}
                          size="small"
                          onDelete={() => handleRemoveFromGroup(group.id)}
                          deleteIcon={<CloseIcon />}
                          sx={{
                            backgroundColor: group.color || "#ff9800",
                            color: "#fff",
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
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
                  <Alert severity="error" onClose={() => setSaveError("")}>
                    {saveError}
                  </Alert>
                )}
              </Stack>
            </Box>
          </Paper>
          <Box
            sx={{ flex: 1, minWidth: 0, display: "flex", overflow: "hidden" }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                borderRight: {
                  xs: "none",
                  lg: "1px solid rgba(255,255,255,0.08)",
                },
                overflow: "hidden",
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
                    backgroundColor: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TextField
                      fullWidth
                      variant="standard"
                      placeholder="Search within file..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      InputProps={{
                        disableUnderline: true,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon
                              fontSize="small"
                              sx={{ opacity: 0.7, mr: 1 }}
                            />
                          </InputAdornment>
                        ),
                        sx: {
                          fontSize: "0.875rem",
                          "& input::placeholder": {
                            color: "text.secondary",
                            opacity: 0.7,
                          },
                        },
                      }}
                      size="small"
                    />
                    {searchQuery && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flexShrink: 0 }}
                      >
                        <Badge
                          badgeContent={parseSearchQuery.length}
                          color="primary"
                          sx={{
                            "& .MuiBadge-badge": {
                              fontSize: "0.6rem",
                              height: 16,
                              minWidth: 16,
                            },
                          }}
                        >
                          <TextFieldsIcon
                            fontSize="small"
                            sx={{ opacity: 0.7 }}
                          />
                        </Badge>
                        <Typography
                          variant="caption"
                          sx={{ whiteSpace: "nowrap", opacity: 0.8 }}
                        >
                          {totalMatches > 0
                            ? `${currentMatchIndex + 1}/${totalMatches}`
                            : "No matches"}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Previous match">
                            <span>
                              <IconButton
                                size="small"
                                onClick={handlePrevMatch}
                                disabled={totalMatches === 0}
                              >
                                <NavigateBeforeIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Next match">
                            <span>
                              <IconButton
                                size="small"
                                onClick={handleNextMatch}
                                disabled={totalMatches === 0}
                              >
                                <NavigateNextIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Clear search">
                            <IconButton
                              size="small"
                              onClick={handleClearSearch}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    )}
                    {searchQuery && (
                      <Fade in={!!searchQuery}>
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{ mt: 1, ml: 4 }}
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={matchCase}
                                onChange={(e) => setMatchCase(e.target.checked)}
                              />
                            }
                            label={
                              <Typography variant="caption">
                                Match case
                              </Typography>
                            }
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={wholeWord}
                                onChange={(e) => setWholeWord(e.target.checked)}
                              />
                            }
                            label={
                              <Typography variant="caption">
                                Whole word
                              </Typography>
                            }
                          />
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
                  overflow: "hidden",
                }}
              >
                {isLoading ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Stack alignItems="center" spacing={2}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        Loading file content...
                      </Typography>
                    </Stack>
                  </Box>
                ) : error ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      textAlign: "center",
                      p: 4,
                    }}
                  >
                    <CodeIcon sx={{ fontSize: 96, mb: 2, opacity: 0.3 }} />
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{ fontWeight: 300 }}
                    >
                      Unable to Load File
                    </Typography>
                    <Typography variant="body1" sx={{ maxWidth: 400 }}>
                      {error instanceof Error
                        ? error.message
                        : "An unknown error occurred while loading the file"}
                    </Typography>
                  </Box>
                ) : !isTextFile ? (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      textAlign: "center",
                      p: 4,
                    }}
                  >
                    <DescriptionIcon
                      sx={{ fontSize: 96, mb: 3, opacity: 0.3 }}
                    />
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{ fontWeight: 300 }}
                    >
                      Binary File Preview
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, maxWidth: 400 }}>
                      This file type cannot be displayed in the text viewer.
                      Download the file to view its contents with an appropriate
                      application.
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<DownloadIcon />}
                      onClick={handleDownload}
                    >
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
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Chip
                            label={getLanguageFromMimeType(
                              file?.mime_type || "",
                            )}
                            size="small"
                            color="primary"
                          />
                          {explanation && (
                            <Chip
                              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                              label="AI Explained"
                              size="small"
                              sx={{
                                backgroundColor: "rgba(255, 152, 0, 0.15)",
                                color: "#ff9800",
                                border: "1px solid rgba(255, 152, 0, 0.3)",
                              }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {data.encoding} • {formatFileSize(data.size)} •{" "}
                          {editedContent.split("\n").length} lines
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
                            "& .MuiOutlinedInput-root": {
                              height: "100%",
                              alignItems: "flex-start",
                              borderRadius: 2,
                            },
                            "& .MuiOutlinedInput-input": {
                              fontFamily: '"Fira Code", monospace',
                              fontSize: "0.875rem",
                              lineHeight: 1.6,
                              p: 3,
                              height: "100% !important",
                              overflow: "auto !important",
                            },
                          }}
                          InputProps={{ style: { height: "100%" } }}
                        />
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
                          "&::-webkit-scrollbar-track": {
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: 4,
                          },
                          "&::-webkit-scrollbar-thumb": {
                            background: "rgba(255,255,255,0.2)",
                            borderRadius: 4,
                          },
                          "& mark": {
                            transition: "all 0.2s ease",
                            borderRadius: "3px",
                          },
                        }}
                      >
                        {renderTextWithHighlights()}
                      </Box>
                    )}
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                display: { xs: "none", lg: "block" },
                width: 380,
                minWidth: 380,
                maxWidth: 420,
                p: 2,
                pl: 0,
                overflow: "hidden",
              }}
            >
              <ExplanationPanel
                explanation={explanation}
                query={initialSearchQuery}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            p: 2,
            background: "rgba(0,0,0,0.1)",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {explanation
              ? "AI explanation available in the right panel"
              : "Perform semantic search to generate explanations"}
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
                  disabled={
                    deleteFileMutation.isPending || uploadFileMutation.isPending
                  }
                >
                  {deleteFileMutation.isPending ||
                  uploadFileMutation.isPending ? (
                    <CircularProgress size={18} sx={{ color: "white" }} />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                variant="outlined"
                startIcon={<CloseIcon />}
              >
                Close
              </Button>
            )}
          </Stack>
        </DialogActions>
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
          .filter(
            (g) => !fileGroups?.some((fg: { id: string }) => fg.id === g.id),
          )
          .map((group) => (
            <MenuItem key={group.id} onClick={() => handleAddToGroup(group.id)}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: group.color || "#ff9800",
                  mr: 1.5,
                }}
              />
              {group.id}
            </MenuItem>
          ))}
        {containerGroups.filter(
          (g) => !fileGroups?.some((fg: { id: string }) => fg.id === g.id),
        ).length === 0 && <MenuItem disabled>No available groups</MenuItem>}
      </Menu>
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(26, 31, 54, 0.98)",
            backdropFilter: "blur(20px)",
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
          sx={{ color: "error.main" }}
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
            Are you sure you want to permanently delete{" "}
            <strong>{file?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </Box>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setShowDeleteConfirm(false)}
            variant="outlined"
          >
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
            {deleteFileMutation.isPending ? (
              <CircularProgress size={18} sx={{ color: "white" }} />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
