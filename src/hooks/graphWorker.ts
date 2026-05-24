export interface WorkerMessage {
  type: "RENDER" | "INIT" | "UPDATE_POSITIONS";
  payload?: any;
}

export interface RenderData {
  canvasWidth: number;
  canvasHeight: number;
  pan: { x: number; y: number };
  zoom: number;
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
    name: string;
    path: string;
    degree: number;
    groups?: Array<{ groupId: string; color: string }>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    bidirectional: boolean;
  }>;
  useCurvedEdges: boolean;
  semanticMap: Array<[string, number]>;
  isSemanticSearch: boolean;
  recommendationSet: string[];
  hoveredNodeId: string | null;
}

declare const self: Worker;

let positionsBuffer: Float32Array | null = null;
let nodeCount = 0;

self.addEventListener('message', (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT':
      if (payload.buffer) {
        positionsBuffer = new Float32Array(payload.buffer);
        nodeCount = payload.nodeCount;
      }
      break;
    case 'UPDATE_POSITIONS':
      if (positionsBuffer) {
        const { xs, ys, radii } = payload;
        for (let i = 0; i < nodeCount; i++) {
          positionsBuffer[i * 3] = xs[i];
          positionsBuffer[i * 3 + 1] = ys[i];
          positionsBuffer[i * 3 + 2] = radii[i];
        }
      }
      break;
    case 'RENDER':
      renderGraph(payload);
      break;
  }
});

function renderGraph(data: RenderData) {
  const {
    canvasWidth,
    canvasHeight,
    pan,
    zoom,
    nodes,
    edges,
    useCurvedEdges,
    semanticMap: serializedSemanticMap,
    isSemanticSearch,
    recommendationSet: serializedRecommendationSet,
    hoveredNodeId,
  } = data;

  const semanticMap = new Map(serializedSemanticMap);
  const recommendationSet = new Set(serializedRecommendationSet);

  const offscreen = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = offscreen.getContext(
    "2d",
  ) as OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return;

  const WORLD_SIZE = 60000;
  const WORLD_CENTER = WORLD_SIZE / 2;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
  gradient.addColorStop(0, "#0a0a0a");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const transformPoint = (x: number, y: number) => ({
    x: (x - WORLD_CENTER) * zoom + canvasWidth / 2 + pan.x,
    y: (y - WORLD_CENTER) * zoom + canvasHeight / 2 + pan.y,
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  edges.forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    const p1 = transformPoint(sourceNode.x, sourceNode.y);
    const p2 = transformPoint(targetNode.x, targetNode.y);

    if (p1.x < -100 && p2.x < -100) return;
    if (p1.x > canvasWidth + 100 && p2.x > canvasWidth + 100) return;
    if (p1.y < -100 && p2.y < -100) return;
    if (p1.y > canvasHeight + 100 && p2.y > canvasHeight + 100) return;

    ctx.beginPath();
    if (useCurvedEdges) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = Math.min(100, dist * 0.3) * (edge.bidirectional ? 0 : 1);
      const ctrlX = midX - dy * (offset / dist);
      const ctrlY = midY + dx * (offset / dist);
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
    } else {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }

    const intensity = Math.min(0.8, 0.3 + (edge.weight || 1) * 0.3);
    ctx.strokeStyle = `rgba(100, 150, 255, ${intensity})`;
    ctx.lineWidth = Math.max(1, Math.min(4, (edge.weight || 1) * 2));
    ctx.stroke();

    if (edge.weight > 0.8 && !edge.bidirectional) {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrowSize = 8;
      const arrowX = p2.x - arrowSize * Math.cos(angle);
      const arrowY = p2.y - arrowSize * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowSize * Math.sin(angle),
        arrowY + arrowSize * Math.cos(angle),
      );
      ctx.lineTo(
        arrowX + arrowSize * Math.sin(angle),
        arrowY - arrowSize * Math.cos(angle),
      );
      ctx.fillStyle = `rgba(100, 150, 255, ${intensity})`;
      ctx.fill();
    }
  });

  nodes.forEach((node) => {
    const p = transformPoint(node.x, node.y);
    if (
      p.x < -100 ||
      p.x > canvasWidth + 100 ||
      p.y < -100 ||
      p.y > canvasHeight + 100
    )
      return;

    const baseRadius = Math.min(24, Math.max(8, node.radius * 0.8));
    const radius = baseRadius * Math.max(0.8, zoom);
    const semanticScore =
      semanticMap.get(node.path) || semanticMap.get(node.name);
    const isSemanticSelected = isSemanticSearch && semanticScore !== undefined;
    const isRecommended = recommendationSet.has(node.path);

    let fill = "#6c6c6c";
    let glowColor = "";

    if (isRecommended) {
      fill = "#ff9800";
      glowColor = "#ff9800";
    }
    if (isSemanticSelected) {
      fill = "#22c55e";
      glowColor = "#22c55e";
    }

    if (glowColor && node.id === hoveredNodeId) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;

    let strokeColor =
      node.id === hoveredNodeId ? "#ffffff" : "rgba(255,255,255,0.4)";
    if (node.groups && node.groups.length > 0) {
      strokeColor = node.groups[0].color || "#ff9800";
      ctx.lineWidth = 2.5;
    } else {
      ctx.lineWidth = node.id === hoveredNodeId ? 2.5 : 1.5;
    }
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    if (radius > 14) {
      ctx.fillStyle = "#ffffff";
      const fontSize = Math.max(10, Math.min(12, radius * 0.6));
      ctx.font = `${fontSize}px "Segoe UI", "Roboto", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let label = node.name;
      const maxChars = Math.floor(radius * 1.5);
      if (label.length > maxChars) label = label.slice(0, maxChars - 2) + "…";
      ctx.fillText(label, p.x, p.y);
    }
  });

  const imageBitmap = offscreen.transferToImageBitmap();
  self.postMessage(
    { type: "RENDER_COMPLETE", payload: { imageBitmap, hoveredNodeId } },
    [imageBitmap],
  );
}
