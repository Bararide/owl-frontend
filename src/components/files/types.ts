import { ApiFile, Group, RecommendationFile, SearchResultFile, SemanticGraphData } from "../../api/client";

export type Severity = "success" | "error" | "info" | "warning";

export interface SearchMatch {
  word: string;
  positions: number[];
  color: string;
}

export interface FileContentDialogProps {
  open: boolean;
  onClose: () => void;
  file: ApiFile | null;
  containerId: string;
  allFiles: ApiFile[];
  onFileUpdated?: () => void;
  onFileDeleted?: () => void;
  onFileChange?: (file: ApiFile) => void;
  searchQuery?: string;
  containerGroups?: Group[];
  onAddToGroup?: (groupId: string, fileId: string) => void;
  onRemoveFromGroup?: (groupId: string, fileId: string) => void;
}

export interface GraphNode {
  id: string;
  path: string;
  name: string;
  file: ApiFile | null;
  degree: number;
  radius: number;
  groups?: { groupId: string; color: string }[];
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  bidirectional: boolean;
}

export interface SemanticGraphCanvasProps {
  files: ApiFile[];
  graphData?: SemanticGraphData;
  semanticResults: SearchResultFile[];
  isSemanticSearch: boolean;
  recommendations: RecommendationFile[];
  onOpenFile: (file: ApiFile) => void;
  useCurvedEdges: boolean;
  onToggleCurvedEdges: () => void;
  onOpenSearch: () => void;
  onOpenHistory: () => void;
  onOpenTools: (e: React.MouseEvent<HTMLElement>) => void;
  searchPopupOpen: boolean;
  searchAnchorRef: React.RefObject<HTMLButtonElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  fileGroupsMap?: Map<string, { groupId: string; color: string }[]>;
  containerId?: string;
  onCreateFile?: (fileName: string, content: string) => Promise<void> | void;
}

export interface GroupManagementDialogProps {
  open: boolean;
  onClose: () => void;
  containerId: string;
  groups: Group[];
  refetchGroups: () => void;
}