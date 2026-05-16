import { useRef, useEffect, useCallback, useState } from 'react';
import type { GraphEngineModule, GraphLayoutEngine, ModuleOptions } from './xgraph';
import createGraphEngine from './xgraph.js';

export function useWasmGraphLayout() {
  const engineRef = useRef<GraphLayoutEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const options: ModuleOptions = {
      locateFile: (path: string) => 
        path.endsWith('.wasm') ? `/wasm/${path}` : path,
    };
    
    createGraphEngine(options).then((mod: GraphEngineModule) => {
      if (mounted) {
        engineRef.current = new mod.GraphLayoutEngine();
        setReady(true);
      }
    }).catch(err => console.error('Failed to load WASM:', err));
    
    return () => { mounted = false; };
  }, []);

  const initGraph = useCallback((
    nodes: Array<{id: string, radius: number}>, 
    edges: Array<{source: string, target: string, weight: number, bidirectional: boolean}>
  ) => {
    if (!engineRef.current || !nodes.length) return;
    engineRef.current.initGraph(
      nodes.map(n => n.id),
      nodes.map(n => n.radius),
      edges.map(e => e.source),
      edges.map(e => e.target),
      edges.map(e => e.weight),
      edges.map(e => e.bidirectional)
    );
  }, []);

  const step = useCallback(() => engineRef.current?.step(), []);
  const getNodeIds = useCallback(() => engineRef.current?.getNodeIds() || [], []);
  const getX = useCallback(() => engineRef.current?.getX() || [], []);
  const getY = useCallback(() => engineRef.current?.getY() || [], []);
  const getRadii = useCallback(() => engineRef.current?.getRadii() || [], []);
  const getIdByIndex = useCallback((idx: number) => 
    engineRef.current?.getIdByIndex(idx) || '', []);
  
  const hitTest = useCallback((
    sx: number, sy: number, px: number, py: number, 
    z: number, w: number, h: number
  ) => engineRef.current?.hitTest(sx, sy, px, py, z, w, h) ?? -1, []);
  
  const setDrag = useCallback((id: string) => engineRef.current?.setDrag(id), []);
  const setDragByIndex = useCallback((idx: number) => 
    engineRef.current?.setDragByIndex(idx), []);
  const updateDrag = useCallback((wx: number, wy: number) => 
    engineRef.current?.updateDrag(wx, wy), []);
  const clearDrag = useCallback(() => engineRef.current?.clearDrag(), []);

  const isStable = useCallback(() => engineRef.current?.isStable?.() ?? false, []);

  return { 
    ready, initGraph, step, isStable, getNodeIds, getX, getY, getRadii, 
    getIdByIndex, hitTest, setDrag, setDragByIndex, updateDrag, clearDrag 
  };
}