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
    Tooltip,
    Paper,
    Chip,
    Stack,
    Slide,
    TextField,
} from "@mui/material";
import {
    Search as SearchIcon,
    Close as CloseIcon,
    Tune as TuneIcon,
    AutoAwesome as AutoAwesomeIcon,
    ShowChart as ShowChartIcon,
    Timeline as TimelineIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    CenterFocusStrong as CenterFocusStrongIcon,
    FolderSpecial as FolderSpecialIcon,
    History as HistoryIcon,
} from "@mui/icons-material";
import type { ApiFile, SearchResultFile, RecommendationFile, SemanticGraphData } from "../../api/client";
import { useWasmGraphLayout } from "./useWasmGraph";
import { useWorkerRenderer } from "../../hooks/useWorkerRenderer";
import { normalizeGraph, formatFileSize } from "./utils";
import type { GraphNode, GraphEdge, SemanticGraphCanvasProps } from "./types";

export const SemanticGraphCanvas: React.FC<SemanticGraphCanvasProps> = React.memo(({
    files,
    graphData,
    semanticResults,
    isSemanticSearch,
    recommendations,
    onOpenFile,
    useCurvedEdges,
    onToggleCurvedEdges,
    onOpenSearch,
    onOpenHistory,
    onOpenTools,
    searchPopupOpen,
    searchAnchorRef,
    searchQuery,
    onSearchQueryChange,
    onSearchSubmit,
    fileGroupsMap = new Map(),
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

    const {
        ready,
        initGraph,
        step,
        getNodeIds,
        getX,
        getY,
        getRadii,
        hitTest: wasmHitTest,
        setDrag,
        updateDrag,
        clearDrag,
    } = useWasmGraphLayout();

    const layoutGraph = useMemo(() => normalizeGraph(files, graphData), [files, graphData]);

    const visualGraph = useMemo(() => ({
        nodes: layoutGraph.nodes.map((node) => ({
            ...node,
            groups: fileGroupsMap.get(node.path) || [],
        })),
        edges: layoutGraph.edges
    }), [layoutGraph, fileGroupsMap]);

    const semanticMap = useMemo(() => {
        const map = new Map<string, number>();
        semanticResults.forEach((f) => {
            map.set(f.path, f.score || 0);
            map.set(f.name, f.score || 0);
        });
        return map;
    }, [semanticResults]);

    const recommendationSet = useMemo(
        () => new Set(recommendations.map((r) => r.path)),
        [recommendations],
    );

    useEffect(() => {
        if (ready && layoutGraph.nodes.length > 0) {
            const nodes = layoutGraph.nodes.map((n) => ({ id: n.id, radius: n.radius }));
            const edges = layoutGraph.edges.map((e) => ({
                source: e.source,
                target: e.target,
                weight: e.weight,
                bidirectional: e.bidirectional,
            }));
            initGraph(nodes, edges);
        }
    }, [ready, layoutGraph, initGraph]);

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
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, []);

    const { renderGraph, isWorkerReady, initSharedBuffer, updatePositions } =
        useWorkerRenderer();
    const imageBitmapRef = useRef<ImageBitmap | null>(null);
    const frameRequestRef = useRef<number | null>(null);
    const lastTimestampRef = useRef(0);
    const TARGET_FPS = 20;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    useEffect(() => {
        if (!ready || !isWorkerReady || visualGraph.nodes.length === 0) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const nodeCount = visualGraph.nodes.length;
        const positionBuffer = initSharedBuffer(nodeCount);

        const tick = (timestamp: number) => {
            if (timestamp - lastTimestampRef.current < FRAME_INTERVAL) {
                frameRequestRef.current = requestAnimationFrame(tick);
                return;
            }

            lastTimestampRef.current = timestamp;
            step();
            const width = canvas.width;
            const height = canvas.height;
            if (width === 0 || height === 0) {
                frameRequestRef.current = requestAnimationFrame(tick);
                return;
            }
            const ids = getNodeIds();
            const xs = getX();
            const ys = getY();
            const radii = getRadii();
            if (positionBuffer) {
                for (let i = 0; i < nodeCount; i++) {
                    positionBuffer[i * 3] = xs[i];
                    positionBuffer[i * 3 + 1] = ys[i];
                    positionBuffer[i * 3 + 2] = radii[i];
                }
                updatePositions(xs, ys, radii);
            }
            const renderNodes = ids.map((id, idx) => {
                const node = visualGraph.nodes.find((n) => n.id === String(id));
                return {
                    id: String(id),
                    x: xs[idx],
                    y: ys[idx],
                    radius: radii[idx],
                    name: "",
                    path: node?.path || "",
                    degree: node?.degree || 0,
                    groups: node?.groups || [],
                };
            });
            const renderData = {
                canvasWidth: width,
                canvasHeight: height,
                pan: panRef.current,
                zoom: zoomRef.current,
                nodes: renderNodes,
                edges: visualGraph.edges,
                useCurvedEdges,
                semanticMap,
                isSemanticSearch,
                recommendationSet,
                hoveredNodeId: hoverNodeIdRef.current,
            };
            renderGraph(renderData, (imageBitmap: ImageBitmap) => {
                if (imageBitmapRef.current) imageBitmapRef.current.close();
                imageBitmapRef.current = imageBitmap;
                ctx.drawImage(imageBitmap, 0, 0);
            });
            frameRequestRef.current = requestAnimationFrame(tick);
        };
        frameRequestRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRequestRef.current)
                cancelAnimationFrame(frameRequestRef.current);
            if (imageBitmapRef.current) imageBitmapRef.current.close();
        };
    }, [
        ready,
        isWorkerReady,
        visualGraph,
        semanticMap,
        recommendationSet,
        isSemanticSearch,
        useCurvedEdges,
        step,
        getX,
        getY,
        getRadii,
        getNodeIds,
        renderGraph,
        initSharedBuffer,
        updatePositions,
    ]);

    const isPanningRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    return (
        <Box
            ref={containerRef}
            sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                minHeight: "100vh",
                backgroundColor: "#000",
                overflow: "hidden",
            }}
        >
            <canvas
                ref={canvasRef}
                onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    zoomRef.current = Math.max(0.1, Math.min(2, zoomRef.current * delta));
                }}
                onMouseDown={(e) => {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const mx = e.clientX - rect.left,
                        my = e.clientY - rect.top;
                    const canvasW = canvasRef.current!.width,
                        canvasH = canvasRef.current!.height;
                    const idx = wasmHitTest(
                        mx,
                        my,
                        panRef.current.x,
                        panRef.current.y,
                        zoomRef.current,
                        canvasW,
                        canvasH,
                    );
                    const nodeIds = getNodeIds();
                    if (idx >= 0 && idx < nodeIds.length) {
                        dragNodeIdRef.current = nodeIds[idx];
                        setDrag(nodeIds[idx]);
                    } else {
                        isPanningRef.current = true;
                        lastMouseRef.current = { x: e.clientX, y: e.clientY };
                    }
                }}
                onMouseMove={(e) => {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const mx = e.clientX - rect.left,
                        my = e.clientY - rect.top;
                    const canvasW = canvasRef.current!.width,
                        canvasH = canvasRef.current!.height;
                    const idx = wasmHitTest(
                        mx,
                        my,
                        panRef.current.x,
                        panRef.current.y,
                        zoomRef.current,
                        canvasW,
                        canvasH,
                    );
                    const nodeIds = getNodeIds();
                    const node =
                        idx >= 0 && idx < nodeIds.length
                            ? visualGraph.nodes.find((n) => n.id === nodeIds[idx])
                            : null;
                    hoverNodeIdRef.current = node?.id || null;
                    setHoveredNode(node || null);
                    if (dragNodeIdRef.current) {
                        const wx =
                            (mx - canvasW / 2 - panRef.current.x) / zoomRef.current +
                            WORLD_CENTER;
                        const wy =
                            (my - canvasH / 2 - panRef.current.y) / zoomRef.current +
                            WORLD_CENTER;
                        updateDrag(wx, wy);
                    } else if (isPanningRef.current) {
                        const dx = e.clientX - lastMouseRef.current.x,
                            dy = e.clientY - lastMouseRef.current.y;
                        panRef.current.x += dx;
                        panRef.current.y += dy;
                        lastMouseRef.current = { x: e.clientX, y: e.clientY };
                    }
                }}
                onMouseUp={() => {
                    dragNodeIdRef.current = null;
                    isPanningRef.current = false;
                    clearDrag();
                }}
                onMouseLeave={() => {
                    dragNodeIdRef.current = null;
                    isPanningRef.current = false;
                    hoverNodeIdRef.current = null;
                    setHoveredNode(null);
                }}
                onDoubleClick={(e) => {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const mx = e.clientX - rect.left,
                        my = e.clientY - rect.top;
                    const canvasW = canvasRef.current!.width,
                        canvasH = canvasRef.current!.height;
                    const idx = wasmHitTest(
                        mx,
                        my,
                        panRef.current.x,
                        panRef.current.y,
                        zoomRef.current,
                        canvasW,
                        canvasH,
                    );
                    const nodeIds = getNodeIds();
                    if (idx >= 0 && idx < nodeIds.length) {
                        const node = visualGraph.nodes.find((n) => n.id === nodeIds[idx]);
                        if (node?.file) onOpenFile(node.file);
                    }
                }}
                onClick={(e) => {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    const mx = e.clientX - rect.left,
                        my = e.clientY - rect.top;
                    const canvasW = canvasRef.current!.width,
                        canvasH = canvasRef.current!.height;
                    const idx = wasmHitTest(
                        mx,
                        my,
                        panRef.current.x,
                        panRef.current.y,
                        zoomRef.current,
                        canvasW,
                        canvasH,
                    );
                    const nodeIds = getNodeIds();
                    if (idx >= 0 && idx < nodeIds.length) {
                        const node = visualGraph.nodes.find((n: { id: string; }) => n.id === nodeIds[idx]);
                        if (node?.file) onOpenFile(node.file);
                    }
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    cursor: dragNodeIdRef.current
                        ? "grabbing"
                        : hoveredNode
                            ? "pointer"
                            : "grab",
                }}
            />
            <Box
                sx={{
                    position: "absolute",
                    top: 16,
                    left: 100,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        pointerEvents: "auto",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 0.5,
                            borderRadius: 2,
                            background: "rgba(26, 31, 54, 0.9)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        <Tooltip title="Semantic Search">
                            <IconButton
                                ref={searchAnchorRef}
                                size="small"
                                sx={{ color: "white" }}
                                onClick={onOpenSearch}
                            >
                                <SearchIcon />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 0.5,
                            borderRadius: 2,
                            background: "rgba(26, 31, 54, 0.9)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            pointerEvents: "auto",
                            ml: 1,
                        }}
                    >
                        <Tooltip title="Search History">
                            <IconButton
                                size="small"
                                sx={{ color: "white" }}
                                onClick={onOpenHistory}
                            >
                                <HistoryIcon />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                    <Slide
                        direction="left"
                        in={searchPopupOpen}
                        mountOnEnter
                        unmountOnExit
                        timeout={300}
                    >
                        <Paper
                            elevation={6}
                            sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                background: "rgba(26, 31, 54, 0.98)",
                                backdropFilter: "blur(20px)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                "@keyframes slideIn": {
                                    from: {
                                        opacity: 0,
                                        transform: "translateX(-20px) scale(0.95)",
                                    },
                                    to: { opacity: 1, transform: "translateX(0) scale(1)" },
                                },
                            }}
                        >
                            <TextField
                                variant="standard"
                                placeholder="Search by meaning..."
                                value={searchQuery}
                                onChange={(e) => onSearchQueryChange(e.target.value)}
                                InputProps={{
                                    disableUnderline: true,
                                    sx: {
                                        fontSize: "0.875rem",
                                        color: "white",
                                        "& input::placeholder": { color: "rgba(255,255,255,0.6)" },
                                    },
                                }}
                                size="small"
                                sx={{ minWidth: 200 }}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onSearchSubmit();
                                }}
                            />
                            <IconButton
                                size="small"
                                sx={{ color: "rgba(255,255,255,0.7)" }}
                                onClick={onOpenSearch}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Paper>
                    </Slide>
                </Box>
                <Box
                    sx={{
                        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: searchPopupOpen ? "translateX(8px)" : "translateX(0)",
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 0.5,
                            borderRadius: 2,
                            background: "rgba(26, 31, 54, 0.9)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            pointerEvents: "auto",
                        }}
                    >
                        <Tooltip title="Tools">
                            <IconButton
                                size="small"
                                sx={{ color: "white" }}
                                onClick={onOpenTools}
                            >
                                <TuneIcon />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>
                <Box
                    sx={{
                        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: searchPopupOpen ? "translateX(16px)" : "translateX(0)",
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 0.5,
                            borderRadius: 2,
                            background: "rgba(26, 31, 54, 0.9)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            pointerEvents: "auto",
                        }}
                    >
                        <Tooltip
                            title={
                                useCurvedEdges
                                    ? "Switch to straight edges"
                                    : "Switch to curved edges"
                            }
                        >
                            <IconButton
                                size="small"
                                sx={{ color: "white" }}
                                onClick={onToggleCurvedEdges}
                            >
                                {useCurvedEdges ? <ShowChartIcon /> : <TimelineIcon />}
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>
                <Box
                    sx={{
                        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: searchPopupOpen ? "translateX(24px)" : "translateX(0)",
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 0.5,
                            borderRadius: 2,
                            background: "rgba(26, 31, 54, 0.9)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            pointerEvents: "auto",
                        }}
                    >
                        <Tooltip title="Manage Groups">
                            <IconButton
                                size="small"
                                sx={{ color: "white" }}
                                onClick={onOpenTools}
                            >
                                <FolderSpecialIcon />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                </Box>
                {recommendations.length > 0 && (
                    <Box
                        sx={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: searchPopupOpen ? "translateX(32px)" : "translateX(0)",
                        }}
                    >
                        <Paper
                            elevation={3}
                            sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 2,
                                background: "rgba(255, 152, 0, 0.2)",
                                backdropFilter: "blur(10px)",
                                border: "1px solid rgba(255, 152, 0, 0.3)",
                                pointerEvents: "auto",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                            }}
                        >
                            <AutoAwesomeIcon sx={{ fontSize: 16, color: "#ff9800" }} />
                            <Typography
                                variant="caption"
                                sx={{ color: "#ff9800", fontWeight: 500 }}
                            >
                                {recommendations.length}
                            </Typography>
                        </Paper>
                    </Box>
                )}
            </Box>
            <Box
                sx={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    display: "flex",
                    gap: 1,
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: 0.5,
                        borderRadius: 2,
                        background: "rgba(26, 31, 54, 0.9)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        pointerEvents: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                    }}
                >
                    <Tooltip title="Zoom out">
                        <IconButton
                            size="small"
                            onClick={() => {
                                zoomRef.current = Math.max(0.1, zoomRef.current * 0.9);
                            }}
                            sx={{ color: "white" }}
                        >
                            <ZoomOutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Typography
                        variant="caption"
                        sx={{ color: "white", minWidth: 40, textAlign: "center" }}
                    >
                        {Math.round(zoomRef.current * 100)}%
                    </Typography>
                    <Tooltip title="Zoom in">
                        <IconButton
                            size="small"
                            onClick={() => {
                                zoomRef.current = Math.min(2, zoomRef.current * 1.1);
                            }}
                            sx={{ color: "white" }}
                        >
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset view">
                        <IconButton
                            size="small"
                            onClick={() => {
                                zoomRef.current = 1;
                                panRef.current = { x: 0, y: 0 };
                            }}
                            sx={{ color: "white" }}
                        >
                            <CenterFocusStrongIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Paper>
            </Box>
            <Box
                sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    zIndex: 10,
                    pointerEvents: "none",
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        background: "rgba(26, 31, 54, 0.9)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        pointerEvents: "auto",
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: "#6c6c6c",
                            }}
                        />
                        <Typography variant="caption" sx={{ color: "white" }}>
                            Files
                        </Typography>
                    </Stack>
                </Paper>
                <Paper
                    elevation={3}
                    sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        background: "rgba(26, 31, 54, 0.9)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        pointerEvents: "auto",
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: "#22c55e",
                            }}
                        />
                        <Typography variant="caption" sx={{ color: "white" }}>
                            Semantic
                        </Typography>
                    </Stack>
                </Paper>
                <Paper
                    elevation={3}
                    sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        background: "rgba(26, 31, 54, 0.9)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        pointerEvents: "auto",
                    }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: "#ff9800",
                            }}
                        />
                        <Typography variant="caption" sx={{ color: "white" }}>
                            Recommended
                        </Typography>
                    </Stack>
                </Paper>
            </Box>
            {hoveredNode && (
                <Paper
                    elevation={6}
                    sx={{
                        position: "absolute",
                        right: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        p: 1.5,
                        minWidth: 220,
                        maxWidth: 320,
                        background: "rgba(18,18,18,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                        zIndex: 10,
                        pointerEvents: "none",
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {hoveredNode.name}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            display: "block",
                            color: "rgba(255,255,255,0.7)",
                            wordBreak: "break-word",
                        }}
                    >
                        {hoveredNode.path}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 1, flexWrap: "wrap" }}
                        useFlexGap
                    >
                        <Chip
                            label={`${hoveredNode.degree} edges`}
                            size="small"
                            variant="outlined"
                            sx={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}
                        />
                        {hoveredNode.file && (
                            <Chip
                                label={formatFileSize(hoveredNode.file.size)}
                                size="small"
                                variant="outlined"
                                sx={{ color: "white", borderColor: "rgba(255,255,255,0.3)" }}
                            />
                        )}
                        {semanticMap.has(hoveredNode.path) && (
                            <Chip
                                label={`Similarity ${(semanticMap.get(hoveredNode.path) || 0).toFixed(2)}`}
                                size="small"
                                sx={{
                                    backgroundColor: "rgba(34,197,94,0.2)",
                                    color: "#22c55e",
                                    borderColor: "rgba(34,197,94,0.3)",
                                }}
                            />
                        )}
                    </Stack>
                    {hoveredNode.groups && hoveredNode.groups.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: "#ff9800" }}
                            >
                                Groups:
                            </Typography>
                            <Stack
                                direction="row"
                                spacing={0.5}
                                flexWrap="wrap"
                                sx={{ mt: 0.5 }}
                            >
                                {hoveredNode.groups.map((g) => (
                                    <Chip
                                        key={g.groupId}
                                        label={g.groupId}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            color: g.color,
                                            borderColor: g.color,
                                            "& .MuiChip-label": { color: g.color },
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
}, (prev, next) => {
    if (prev.files !== next.files) return false;
    if (prev.graphData !== next.graphData) return false;
    if (prev.semanticResults !== next.semanticResults) return false;
    if (prev.isSemanticSearch !== next.isSemanticSearch) return false;
    if (prev.recommendations !== next.recommendations) return false;
    if (prev.useCurvedEdges !== next.useCurvedEdges) return false;
    if (prev.fileGroupsMap?.size !== next.fileGroupsMap?.size) return false;
    return true;
});