import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Menu,
  MenuItem,
  Divider,
  Snackbar,
  Alert,
  IconButton,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Paper,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  FolderSpecial as FolderSpecialIcon,
  History as HistoryIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import type { ApiFile, SearchResultFile, RecommendationFile, Group } from "../../api/client";
import { apiClient } from "../../api/client";
import {
  useFiles,
  useSemanticSearch,
  useRecommendationsStream,
  useNotifications,
  useContainerGroups,
  useAddFileToGroup,
  useRemoveFileFromGroup,
  useSearchHistory,
} from "../../hooks/useApi";
import { useWebSocketGraph } from "../../hooks/useWebSocketGraph";
import { SemanticGraphCanvas } from "./SemanticGraphCanvas";
import { FileContentDialog } from "./FileContentDialog";
import { GroupManagementDialog } from "./GroupManagementDialog";
import type { Severity } from "./types";

export default function FilesView({ containerId }: { containerId: string }) {
  const {
    data: files = [],
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useFiles(containerId);
  
  const {
    graphData,
    groups: wsGroups,
    fileGroupsMap: wsFileGroupsMap,
    isConnected: graphWsConnected,
    requestGraphData,
    requestGroups,
    requestFileGroupsMap,
    subscribeToGraphUpdates,
    unsubscribeFromGraphUpdates,
  } = useWebSocketGraph(containerId);
  
  const { data: apiGroups = [], refetch: refetchApiGroups } =
    useContainerGroups(containerId);
  
  const { data: searchHistory, refetch: refetchSearchHistory } = useSearchHistory(containerId);
  
  const addFileToGroup = useAddFileToGroup();
  const removeFileFromGroup = useRemoveFileFromGroup();
  const { addNotification, notification, closeNotification } = useNotifications();
  const semanticSearchMutation = useSemanticSearch();
  
  const { paths: recommendedPaths } = useRecommendationsStream(
    containerId,
    (newPaths) =>
      addNotification({
        message: `Found ${newPaths.length} recommended files`,
        severity: "info",
        open: true,
      }),
    (finalPaths) =>
      addNotification({
        message: `Recommendations completed: ${finalPaths.length} files`,
        severity: "success",
        open: true,
      }),
  );
  
  useEffect(() => {
    if (graphWsConnected && containerId) {
      const timer = setTimeout(() => {
        requestGraphData();
        requestGroups();
        requestFileGroupsMap();
        subscribeToGraphUpdates();
        refetchSearchHistory(); // Загружаем историю при подключении
      }, 100);
      return () => clearTimeout(timer);
    }
    return () => {
      if (graphWsConnected) unsubscribeFromGraphUpdates();
    };
  }, [graphWsConnected, containerId, requestGraphData, requestGroups, requestFileGroupsMap, subscribeToGraphUpdates, unsubscribeFromGraphUpdates, refetchSearchHistory]);
  
  const [fileContentDialog, setFileContentDialog] = useState<{
    open: boolean;
    file: ApiFile | null;
    currentIndex: number;
  }>({ open: false, file: null, currentIndex: 0 });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [useCurvedEdges, setUseCurvedEdges] = useState(true);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [rebuildNotification, setRebuildNotification] = useState<{
    open: boolean;
    message: string;
    severity: Severity;
  }>({ open: false, message: "", severity: "info" });
  const [fileGroupsMap, setFileGroupsMap] = useState<
    Map<string, { groupId: string; color: string }[]>
  >(new Map());
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const searchAnchorRef = useRef<HTMLButtonElement>(null);
  
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    [...(wsGroups || []), ...apiGroups].forEach((g) => {
      if (g?.id) map.set(g.id, g);
    });
    return Array.from(map.values());
  }, [wsGroups, apiGroups]);
  
  const recommendationFiles: RecommendationFile[] = recommendedPaths.map(
    (path) => ({
      path,
      name: path.split("/").pop() || "unknown",
      isRecommended: true,
    }),
  );
  
  const currentFilesList = useMemo(() => {
    if (isSemanticSearch) return [...searchResults].reverse();
    if (!searchQuery) return [...files].reverse();
    return [...files]
      .filter(
        (file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.mime_type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .reverse();
  }, [isSemanticSearch, searchResults, searchQuery, files]);
  
  useEffect(() => {
    const combinedMap = new Map<string, { groupId: string; color: string }[]>();
    Object.entries(wsFileGroupsMap || {}).forEach(([path, grps]) => {
      if (grps?.length) combinedMap.set(path, grps);
    });
    setFileGroupsMap(combinedMap);
  }, [wsFileGroupsMap]);
  
  const handleAddToGroup = async (groupId: string, fileId: string) => {
    try {
      await addFileToGroup.mutateAsync({ groupId, fileId });
      await requestFileGroupsMap();
      addNotification({ message: "File added to group", severity: "success", open: true });
    } catch {
      addNotification({ message: "Failed to add file to group", severity: "error", open: true });
    }
  };
  
  const handleRemoveFromGroup = async (groupId: string, fileId: string) => {
    try {
      await removeFileFromGroup.mutateAsync({ groupId, fileId });
      await requestFileGroupsMap();
      addNotification({ message: "File removed from group", severity: "success", open: true });
    } catch {
      addNotification({ message: "Failed to remove file from group", severity: "error", open: true });
    }
  };
  
  const handleSemanticSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !containerId) return;
      setIsSearching(true);
      setIsSemanticSearch(true);
      setShowSearchPopup(false);
      try {
        const result: any = await semanticSearchMutation.mutateAsync({
          query,
          container_id: containerId,
          limit: 50,
        });
        const resultFiles: SearchResultFile[] = (result.results || [])
          .filter((r: any) => r.scope !== undefined)
          .map((r: any) => {
            const existing = files.find(
              (f) => f.path === r.path || f.name === r.path,
            );
            return {
              path: existing?.path || r.path,
              name: existing?.name || r.path.split("/").pop() || "unknown",
              size: existing?.size || 0,
              container_id: containerId,
              user_id: existing?.user_id || "",
              created_at: existing?.created_at || new Date().toISOString(),
              mime_type: existing?.mime_type || "text/plain",
              score: r.scope,
              content_preview: `Score: ${r.scope.toFixed(2)}`,
            };
          })
          .filter(
            (f: { name: string }) =>
              !["container_config.json", "access_policy.json"].includes(f.name),
          );
        setSearchResults(resultFiles);
        // Обновляем историю после успешного поиска
        await refetchSearchHistory();
        addNotification({
          message: `Found ${resultFiles.length} semantically relevant files`,
          severity: "success",
          open: true,
        });
      } catch (error) {
        addNotification({
          message: `Semantic search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          severity: "error",
          open: true,
        });
        setIsSemanticSearch(false);
      } finally {
        setIsSearching(false);
      }
    },
    [containerId, semanticSearchMutation, addNotification, files, refetchSearchHistory],
  );
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setIsSemanticSearch(false);
      setSearchResults([]);
    }
  }, []);
  
  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim() && containerId) handleSemanticSearch(searchQuery);
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
        severity: "success",
      });
      addNotification({
        message: `File index rebuilt. ${result.length} files found.`,
        severity: "success",
        open: true,
      });
    } catch (error) {
      setRebuildNotification({
        open: true,
        message: `Failed to rebuild index: ${error instanceof Error ? error.message : "Unknown error"}`,
        severity: "error",
      });
      addNotification({
        message: "Failed to rebuild file index",
        severity: "error",
        open: true,
      });
      refetchFiles();
    } finally {
      setIsRebuildingIndex(false);
    }
  }, [containerId, refetchFiles, addNotification]);
  
  const openFile = useCallback(
    (file: ApiFile) => {
      const fileIndex = currentFilesList.findIndex(
        (f) => f.path === file.path || f.name === file.name,
      );
      setFileContentDialog({
        open: true,
        file,
        currentIndex: fileIndex >= 0 ? fileIndex : 0,
      });
    },
    [currentFilesList],
  );
  
  const handleCloseFileContent = useCallback(() => {
    setFileContentDialog({ open: false, file: null, currentIndex: 0 });
  }, []);
  
  const handleNextFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    const nextIndex =
      (fileContentDialog.currentIndex + 1) % currentFilesList.length;
    setFileContentDialog({
      open: true,
      file: currentFilesList[nextIndex],
      currentIndex: nextIndex,
    });
  }, [fileContentDialog, currentFilesList]);
  
  const handlePrevFile = useCallback(() => {
    if (!fileContentDialog.file || currentFilesList.length === 0) return;
    const prevIndex =
      fileContentDialog.currentIndex > 0
        ? fileContentDialog.currentIndex - 1
        : currentFilesList.length - 1;
    setFileContentDialog({
      open: true,
      file: currentFilesList[prevIndex],
      currentIndex: prevIndex,
    });
  }, [fileContentDialog, currentFilesList]);
  
  const handleToggleCurvedEdges = useCallback(
    () => setUseCurvedEdges((prev) => !prev),
    [],
  );
  
  const handleOpenSearch = useCallback(
    () => setShowSearchPopup((prev) => !prev),
    [],
  );
  
  const handleOpenTools = useCallback(
    (e: React.MouseEvent<HTMLElement>) => setToolsMenuAnchor(e.currentTarget),
    [],
  );
  
  const handleOpenGroupDialog = useCallback(() => setGroupDialogOpen(true), []);
  
  const handleOpenHistory = useCallback(() => {
    setHistoryDrawerOpen(true);
    refetchSearchHistory(); // Обновляем историю при открытии
  }, [refetchSearchHistory]);
  
  const handleHistoryFileClick = useCallback((filePath: string) => {
    // Находим файл по пути
    const file = files.find(f => f.path === filePath || f.name === filePath);
    if (file) {
      openFile(file);
      setHistoryDrawerOpen(false);
    } else {
      addNotification({
        message: `File not found: ${filePath}`,
        severity: "warning",
        open: true,
      });
    }
  }, [files, openFile, addNotification]);
  
  if (!containerId)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          textAlign: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
        }}
      >
        <DescriptionIcon
          sx={{ fontSize: 96, color: "text.secondary", mb: 3, opacity: 0.3 }}
        />
        <Typography
          variant="h4"
          color="text.secondary"
          gutterBottom
          sx={{ fontWeight: 300 }}
        >
          No Container Selected
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 400 }}
        >
          Please select a container from the sidebar to view and manage its
          files
        </Typography>
      </Box>
    );
  
  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#000",
        position: "relative",
      }}
    >
      <Menu
        anchorEl={toolsMenuAnchor}
        open={Boolean(toolsMenuAnchor)}
        onClose={() => setToolsMenuAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(26, 31, 54, 0.98)",
            backdropFilter: "blur(20px)",
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
          {isRebuildingIndex ? "Rebuilding Index..." : "Rebuild Index"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setToolsMenuAnchor(null);
            handleOpenGroupDialog();
          }}
        >
          <FolderSpecialIcon sx={{ mr: 1, fontSize: 20 }} />
          Manage Groups
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => setToolsMenuAnchor(null)}>
          <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
          Settings
        </MenuItem>
      </Menu>
      
      {/* Drawer для истории поиска */}
      <Drawer
        anchor="right"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 400,
            background: "rgba(26, 31, 54, 0.98)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      >
        <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <HistoryIcon />
              Search History
              <Badge
                badgeContent={searchHistory?.history?.length || 0}
                color="primary"
                sx={{ ml: 1 }}
              />
            </Typography>
            <IconButton onClick={() => setHistoryDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          {!searchHistory ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
              <CircularProgress size={40} />
            </Box>
          ) : searchHistory.history.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" }}>
              <HistoryIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.3 }} />
              <Typography color="text.secondary">
                No search history yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Perform semantic searches to see history here
              </Typography>
            </Box>
          ) : (
            <List sx={{ flex: 1, overflow: "auto" }}>
              {searchHistory.history.map((filePath, index) => {
                const fileName = filePath.split("/").pop() || filePath;
                const file = files.find(f => f.path === filePath || f.name === filePath);
                return (
                  <ListItem key={`${filePath}-${index}`} disablePadding divider>
                    <ListItemButton onClick={() => handleHistoryFileClick(filePath)}>
                      <ListItemIcon>
                        <DescriptionIcon sx={{ color: file ? "primary.main" : "text.disabled" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={fileName}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {filePath}
                            {!file && " (file not found)"}
                          </Typography>
                        }
                        primaryTypographyProps={{
                          style: {
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </Drawer>
      
      <Box sx={{ flex: 1, minHeight: 0, position: "relative" }}>
        {isLoadingFiles ? (
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
        ) : files.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              p: 4,
            }}
          >
            <DescriptionIcon
              sx={{
                fontSize: 96,
                color: "text.secondary",
                mb: 3,
                opacity: 0.3,
              }}
            />
            <Typography
              variant="h5"
              color="text.secondary"
              gutterBottom
              sx={{ fontWeight: 300 }}
            >
              No Files Available
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 500 }}
            >
              This container doesn&apos;t have any files yet. Try rebuilding the
              index or uploading files.
            </Typography>
            <Button
              variant="contained"
              onClick={handleRefreshFiles}
              startIcon={<RefreshIcon />}
              disabled={isRebuildingIndex}
            >
              {isRebuildingIndex ? "Rebuilding Index..." : "Rebuild Index"}
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
            useCurvedEdges={useCurvedEdges}
            onToggleCurvedEdges={handleToggleCurvedEdges}
            onOpenSearch={handleOpenSearch}
            onOpenTools={handleOpenTools}
            onOpenHistory={handleOpenHistory}
            searchPopupOpen={showSearchPopup}
            searchAnchorRef={searchAnchorRef}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            fileGroupsMap={fileGroupsMap}
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
        containerGroups={groups}
        onAddToGroup={handleAddToGroup}
        onRemoveFromGroup={handleRemoveFromGroup}
      />
      <GroupManagementDialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        containerId={containerId}
        groups={groups}
        refetchGroups={refetchApiGroups}
      />
      <Snackbar
        open={rebuildNotification.open}
        autoHideDuration={6000}
        onClose={() =>
          setRebuildNotification((prev) => ({ ...prev, open: false }))
        }
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={rebuildNotification.severity}
          onClose={() =>
            setRebuildNotification((prev) => ({ ...prev, open: false }))
          }
          variant="filled"
          sx={{ width: "100%" }}
        >
          {rebuildNotification.message}
        </Alert>
      </Snackbar>
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={notification.severity}
          onClose={closeNotification}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}