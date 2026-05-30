// AdminFileViewer.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Fade,
  Chip,
  CircularProgress,
  Tooltip,
  Paper,
  Stack,
  Dialog,
  DialogContent,
  Divider,
  TextField,
  InputAdornment,
  Button,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  TextFields as TextFieldsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { apiClient } from "../../api/client";
import type { ApiFile } from "../../api/client";
import { useFileContent, useNotifications } from "../../hooks/useApi";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { formatFileSize, getLanguageFromMimeType } from "./utils";

const isMarkdownFile = (filename: string): boolean => {
  return filename.endsWith('.md') || filename.endsWith('.markdown') ||
    filename.endsWith('.mdown') || filename.endsWith('.mkd');
};

const isLatexFile = (filename: string): boolean => {
  return filename.endsWith('.tex') || filename.endsWith('.latex');
};

const shouldRenderAsMarkdown = (filename: string, mimeType: string, content?: string): boolean => {
  if (isMarkdownFile(filename) || mimeType === 'text/markdown') return true;
  if (isLatexFile(filename) && content?.includes('\\(')) return true;
  return false;
};

const extractFileNumber = (filename: string): number => {
  const match = filename.match(/_(\d+)\.(md|markdown|mdown|mkd)$/);
  if (match) return parseInt(match[1], 10);
  const lastNumberMatch = filename.match(/(\d+)(?=[^0-9]*$)/);
  if (lastNumberMatch) return parseInt(lastNumberMatch[1], 10);
  return 0;
};

const sortFilesByNumber = (files: ApiFile[]): ApiFile[] => {
  return [...files].sort((a, b) => extractFileNumber(a.name) - extractFileNumber(b.name));
};

interface AdminFileViewerProps {
  open: boolean;
  onClose: () => void;
  file: ApiFile | null;
  containerId: string;
  allFiles?: ApiFile[];
  onFileChange?: (file: ApiFile) => void;
  searchQuery?: string;
}

export const AdminFileViewer: React.FC<AdminFileViewerProps> = ({
  open,
  onClose,
  file,
  containerId,
  allFiles = [],
  onFileChange,
  searchQuery: initialSearchQuery = "",
}) => {
  const { data, isLoading, error, refetch } = useFileContent(containerId, file?.name || "");
  const { addNotification } = useNotifications();
  
  const content = data?.content || "";
  const explanation = data?.explanation || "";
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [renderMode, setRenderMode] = useState<'raw' | 'rendered'>('rendered');
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const sortedFiles = useMemo(() => sortFilesByNumber(allFiles), [allFiles]);
  const currentSortedIndex = useMemo(() => 
    file ? sortedFiles.findIndex(f => f.name === file.name) : -1, 
  [file, sortedFiles]);
  const currentFileNumber = useMemo(() => file ? extractFileNumber(file.name) : 0, [file]);
  const isTextFile = file?.mime_type?.startsWith("text/") || file?.mime_type === "application/json";

  const parseSearchQuery = useMemo(() => 
    searchQuery.trim().split(/\s+/).filter(Boolean), [searchQuery]);

  const findSearchMatches = useMemo(() => {
    if (!searchQuery.trim() || !content || parseSearchQuery.length === 0) return [];
    const matches: Array<{ word: string; positions: number[]; color: string }> = [];
    const colors = ['#ffeb3b80', '#4caf5080', '#2196f380', '#ff980080', '#e91e6380'];
    
    parseSearchQuery.forEach((word, wordIndex) => {
      const searchTerm = matchCase ? word : word.toLowerCase();
      const contentToSearch = matchCase ? content : content.toLowerCase();
      const positions: number[] = [];
      let position = contentToSearch.indexOf(searchTerm);
      while (position !== -1) {
        positions.push(position);
        position = contentToSearch.indexOf(searchTerm, position + 1);
      }
      if (positions.length > 0) {
        matches.push({ word, positions, color: colors[wordIndex % colors.length] });
      }
    });
    return matches;
  }, [content, searchQuery, parseSearchQuery, matchCase]);

  const totalMatches = useMemo(() => 
    findSearchMatches.reduce((sum, m) => sum + m.positions.length, 0), 
  [findSearchMatches]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const flattenRanges = useMemo(() => {
    const ranges: Array<{ start: number; end: number; color: string; isCurrent: boolean }> = [];
    findSearchMatches.forEach((match) => {
      match.positions.forEach((pos) => {
        ranges.push({ start: pos, end: pos + match.word.length, color: match.color, isCurrent: false });
      });
    });
    ranges.sort((a, b) => a.start - b.start);
    if (currentMatchIndex >= 0 && currentMatchIndex < ranges.length) {
      ranges[currentMatchIndex].isCurrent = true;
    }
    return ranges;
  }, [findSearchMatches, currentMatchIndex]);

  useEffect(() => {
    if (file?.name && open) {
      setSearchQuery(initialSearchQuery);
      setCurrentMatchIndex(-1);
      setRenderMode('rendered');
      setShowSearchBar(false);
      setCopied(false);
      setMatchCase(false);
      setTimeout(() => refetch(), 100);
    }
  }, [file?.name, initialSearchQuery, open, refetch]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setShowSearchBar(false);
      setCopied(false);
      setMatchCase(false);
      setRenderMode('rendered');
    }
  }, [open]);

  useEffect(() => {
    if (currentMatchIndex >= 0 && contentScrollRef.current) {
      const marks = contentScrollRef.current.querySelectorAll('[data-current-match="true"]');
      const current = marks[0] as HTMLElement | undefined;
      if (current) current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentMatchIndex, flattenRanges]);

  useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchBar]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentMatchIndex(-1);
    setShowSearchBar(false);
  };

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1 >= totalMatches ? 0 : prev + 1));
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 < 0 ? totalMatches - 1 : prev - 1));
  };

  const handleCopyContent = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification({ message: "Содержимое скопировано", severity: "success", open: true });
    } catch {
      addNotification({ message: "Не удалось скопировать", severity: "error", open: true });
    }
  }, [content, addNotification]);

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
      addNotification({ message: `Файл "${file.name}" загружен`, severity: "success", open: true });
    } catch (error) {
      addNotification({ message: "Ошибка загрузки", severity: "error", open: true });
    }
  }, [file, containerId, addNotification]);

  const handleNextFile = useCallback(() => {
    if (currentSortedIndex !== -1 && currentSortedIndex < sortedFiles.length - 1) {
      const nextFile = sortedFiles[currentSortedIndex + 1];
      if (nextFile && onFileChange) onFileChange(nextFile);
    }
  }, [sortedFiles, currentSortedIndex, onFileChange]);

  const handlePrevFile = useCallback(() => {
    if (currentSortedIndex !== -1 && currentSortedIndex > 0) {
      const prevFile = sortedFiles[currentSortedIndex - 1];
      if (prevFile && onFileChange) onFileChange(prevFile);
    }
  }, [sortedFiles, currentSortedIndex, onFileChange]);

  const handleToggleRenderMode = () => {
    setRenderMode(prev => prev === 'rendered' ? 'raw' : 'rendered');
  };

  const renderTextWithHighlights = () => {
    if (!content) return null;
    if (flattenRanges.length === 0) return content;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    flattenRanges.forEach((range, index) => {
      if (range.start > lastIndex) {
        parts.push(<span key={`text-${index}`}>{content.slice(lastIndex, range.start)}</span>);
      }
      parts.push(
        <mark key={`highlight-${index}`} data-current-match={range.isCurrent ? "true" : "false"} style={{
          backgroundColor: range.color, color: "inherit", padding: "0 2px", borderRadius: "3px",
          fontWeight: range.isCurrent ? "bold" : "normal", border: range.isCurrent ? "2px solid #ff9800" : "none",
          boxShadow: range.isCurrent ? "0 0 8px rgba(255, 152, 0, 0.5)" : "none", transition: "all 0.2s ease",
        }}>
          {content.slice(range.start, range.end)}
        </mark>
      );
      lastIndex = range.end;
    });
    if (lastIndex < content.length) {
      parts.push(<span key="text-last">{content.slice(lastIndex)}</span>);
    }
    return parts;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowSearchBar(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (showSearchBar) setShowSearchBar(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, showSearchBar, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} fullWidth PaperProps={{
      sx: { borderRadius: 3, background: "linear-gradient(135deg, rgba(26, 31, 54, 0.98) 0%, rgba(26, 31, 54, 0.95) 100%)",
        backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", width: "96vw", height: "92vh",
        maxWidth: "96vw", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }
    }}>
      <Box sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
        <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
          <Tooltip title="Закрыть (Esc)">
            <IconButton onClick={onClose} size="small" sx={{ bgcolor: "rgba(0,0,0,0.5)", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Боковая панель с действиями */}
          <Box sx={{ width: 56, borderRight: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(0,0,0,0.3)",
            display: "flex", flexDirection: "column", alignItems: "center", py: 2, gap: 1, flexShrink: 0, overflowY: "auto" }}>
            
            {sortedFiles.length > 1 && (
              <>
                <Tooltip title="Предыдущий файл" placement="right">
                  <IconButton onClick={handlePrevFile} size="small" disabled={currentSortedIndex <= 0} 
                    sx={{ color: currentSortedIndex <= 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)" }}>
                    <ChevronLeftIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Следующий файл" placement="right">
                  <IconButton onClick={handleNextFile} size="small" disabled={currentSortedIndex >= sortedFiles.length - 1}
                    sx={{ color: currentSortedIndex >= sortedFiles.length - 1 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)" }}>
                    <ChevronRightIcon />
                  </IconButton>
                </Tooltip>
                {currentFileNumber > 0 && (
                  <Typography variant="caption" sx={{ mt: 0.5, color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>#{currentFileNumber}</Typography>
                )}
                <Divider sx={{ width: 32, my: 1, bgcolor: "rgba(255,255,255,0.1)" }} />
              </>
            )}

            {isTextFile && (
              <>
                <Tooltip title="Поиск (Ctrl+F)" placement="right">
                  <IconButton onClick={() => setShowSearchBar(true)} size="small" 
                    sx={{ color: showSearchBar ? "#ff9800" : "rgba(255,255,255,0.7)" }}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={renderMode === 'rendered' ? "Показать исходный код" : "Показать отрендеренный"} placement="right">
                  <IconButton onClick={handleToggleRenderMode} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {renderMode === 'rendered' ? <CodeIcon /> : <TextFieldsIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Копировать содержимое" placement="right">
                  <IconButton onClick={handleCopyContent} size="small" sx={{ color: copied ? "#4caf50" : "rgba(255,255,255,0.7)" }}>
                    {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title="Скачать файл" placement="right">
              <IconButton onClick={handleDownload} size="small" sx={{ color: "rgba(255,255,255,0.7)" }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>

            <Divider sx={{ width: 32, my: 1, bgcolor: "rgba(255,255,255,0.1)" }} />
          </Box>

          {/* Основной контент */}
          <DialogContent sx={{ p: 0, flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              
              {/* Поиск */}
              {isTextFile && showSearchBar && (
                <Fade in={showSearchBar}>
                  <Paper elevation={0} sx={{ mx: 2, mt: 2, mb: 1, p: 1.5, borderRadius: 2, 
                    backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <TextField size="small" placeholder="Поиск..." value={searchQuery} onChange={handleSearchChange}
                        inputRef={searchInputRef} variant="outlined" sx={{ flex: 1 }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ opacity: 0.7 }} /></InputAdornment> }} />
                      {searchQuery && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ minWidth: 60 }}>
                            {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : "0 совпадений"}
                          </Typography>
                          <Tooltip title="Назад"><IconButton size="small" onClick={handlePrevMatch} disabled={totalMatches === 0}><NavigateBeforeIcon /></IconButton></Tooltip>
                          <Tooltip title="Вперёд"><IconButton size="small" onClick={handleNextMatch} disabled={totalMatches === 0}><NavigateNextIcon /></IconButton></Tooltip>
                        </Stack>
                      )}
                      <FormControlLabel control={<Switch size="small" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />} 
                        label={<Typography variant="caption">Регистр</Typography>} />
                      <Tooltip title="Закрыть поиск"><IconButton size="small" onClick={handleClearSearch}><CloseIcon /></IconButton></Tooltip>
                    </Stack>
                  </Paper>
                </Fade>
              )}

              {/* Содержимое файла */}
              <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 3 }}>
                {isLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                    <Stack alignItems="center" spacing={2}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">Загрузка файла...</Typography>
                    </Stack>
                  </Box>
                ) : error ? (
                  <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", textAlign: "center" }}>
                    <CodeIcon sx={{ fontSize: 96, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>Не удалось загрузить файл</Typography>
                    <Typography variant="body1" sx={{ maxWidth: 400 }}>{error instanceof Error ? error.message : "Неизвестная ошибка"}</Typography>
                  </Box>
                ) : !isTextFile ? (
                  <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", textAlign: "center" }}>
                    <DescriptionIcon sx={{ fontSize: 96, mb: 3, opacity: 0.3 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 300 }}>Бинарный файл</Typography>
                    <Typography variant="body1" sx={{ mb: 3, maxWidth: 400 }}>Этот тип файла нельзя отобразить в текстовом просмотре. Скачайте файл для просмотра.</Typography>
                    <Button variant="contained" size="large" startIcon={<DownloadIcon />} onClick={handleDownload}>Скачать</Button>
                  </Box>
                ) : data ? (
                  <Paper elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column", 
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                    
                    {/* Заголовок файла */}
                    <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{file?.name}</Typography>
                          <Chip label={shouldRenderAsMarkdown(file?.name || '', file?.mime_type || '', content) ? (isLatexFile(file?.name || '') ? 'LaTeX' : 'Markdown') : getLanguageFromMimeType(file?.mime_type || "")} size="small" color="primary" />
                          {explanation && <Chip icon={<CodeIcon sx={{ fontSize: 14 }} />} label="AI Explained" size="small" sx={{ backgroundColor: "rgba(255, 152, 0, 0.15)", color: "#ff9800" }} />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{formatFileSize(data.size)} • {content.split("\n").length} строк</Typography>
                      </Stack>
                    </Box>

                    {/* Контент */}
                    {shouldRenderAsMarkdown(file?.name || '', file?.mime_type || '', content) && renderMode === 'rendered' ? (
                      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 2 }}>
                        <MarkdownRenderer content={content} />
                      </Box>
                    ) : (
                      <Box ref={contentScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: 3, 
                        fontFamily: '"Fira Code", monospace', fontSize: "0.875rem", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        "&::-webkit-scrollbar": { width: 8, height: 8 }, "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.05)", borderRadius: 4 },
                        "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: 4 } }}>
                        {renderTextWithHighlights()}
                      </Box>
                    )}
                  </Paper>
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}><CircularProgress /></Box>
                )}
              </Box>
            </Box>

            {/* Панель объяснений */}
            {explanation && (
              <Box sx={{ display: { xs: "none", lg: "block" }, width: 380, minWidth: 380, maxWidth: 420, p: 2, pl: 0, overflow: "hidden" }}>
                <Paper elevation={0} sx={{ height: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2, p: 2, overflow: "auto" }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <CodeIcon fontSize="small" sx={{ color: "#ff9800" }} />Объяснение
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{explanation}</Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
        </Box>
      </Box>
    </Dialog>
  );
};