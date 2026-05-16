export interface GraphLayoutEngine {
  initGraph(
    nodeIds: string[],
    radii: number[],
    sources: string[],
    targets: string[],
    weights: number[],
    bidirectional: boolean[]
  ): void;
  step(): void;
  getNodeIds(): string[];
  getX(): number[];
  getY(): number[];
  getRadii(): number[];
  getIdByIndex(idx: number): string;
  hitTest(sx: number, sy: number, px: number, py: number, 
          z: number, w: number, h: number): number;
  setDrag(id: string): void;
  setDragByIndex(idx: number): void;
  updateDrag(wx: number, wy: number): void;
  clearDrag(): void;
  isStable(): boolean;
}

export interface GraphEngineModule {
  GraphLayoutEngine: new () => GraphLayoutEngine;
}

export interface ModuleOptions {
  locateFile?: (path: string) => string;
}

declare const createGraphEngine: (options?: ModuleOptions) => Promise<GraphEngineModule>;
export default createGraphEngine;