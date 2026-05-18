import type { ApiFile, SemanticGraphData } from "../../api/client";
import { MIME_TO_LANGUAGE } from "./constants";

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getLanguageFromMimeType = (mimeType: string): string =>
  MIME_TO_LANGUAGE[mimeType] || "Text";

export const normalizeGraph = (
  files: ApiFile[],
  graphData: SemanticGraphData | undefined,
) => {
  const fileMap = new Map<string, ApiFile>();
  files.forEach((f) => {
    fileMap.set(f.path, f);
    fileMap.set(f.name, f);
  });
  
  let rawEdges: any[] = [], rawNodes: any[] = [];
  if (graphData) {
    if (Array.isArray((graphData as any).graph))
      rawEdges = (graphData as any).graph;
    else if (graphData.edges || graphData.links) {
      rawEdges = graphData.edges || graphData.links || [];
      rawNodes = graphData.nodes || [];
    } else if (Array.isArray(graphData)) rawEdges = graphData;
  }
  
  if (rawNodes.length === 0 && rawEdges.length > 0) {
    const uniqueNodes = new Set<string>();
    rawEdges.forEach((edge: any) => {
      const source = edge.source || edge.from;
      const target = edge.target || edge.to;
      if (source) uniqueNodes.add(source);
      if (target) uniqueNodes.add(target);
    });
    rawNodes = Array.from(uniqueNodes).map((id) => ({
      id,
      path: id,
      name: id.split("/").pop() || id,
    }));
  }
  
  const nodeIdToPath = new Map<string, string>();
  const nodePaths = new Set<string>();
  rawNodes.forEach((node: any) => {
    const path = node.path || node.name || node.title || node.id || "";
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
      name: file?.name || path.split("/").pop() || path,
      file: file || null,
      degree,
      radius: 10 + Math.min(28, degree * 2.2),
    };
  });
  
  return { nodes, edges: normalizedEdges };
};