import { useRef, useEffect, useCallback, useState } from 'react';
import type { GraphEngineModule, GraphLayoutEngine, ModuleOptions } from './xgraph';
import createGraphEngine from './xgraph.js';

export function useWasmGraphLayout() {
    const engineRef = useRef<GraphLayoutEngine | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;
        const options: ModuleOptions = {
            locateFile: (path: string) => {
                if (path.endsWith('.wasm')) {
                    return `/wasm/${path}`;
                }
                return path;
            }
        };
        
        createGraphEngine(options).then((mod: GraphEngineModule) => {
            if (mounted) {
                engineRef.current = new mod.GraphLayoutEngine();
                setReady(true);
            }
        }).catch(err => {
            console.error('Failed to load WASM:', err);
        });
        return () => { mounted = false; };
    }, []);

    const initGraph = useCallback((
        nodes: Array<{id: string, radius: number}>, 
        edges: Array<{source: string, target: string, weight: number, bidirectional: boolean}>
    ) => {
        if (!engineRef.current || !nodes.length) return;
        engineRef.current.initGraph(
            nodes.map(n => String(n.id)),
            nodes.map(n => Number(n.radius)),
            edges.map(e => String(e.source)),
            edges.map(e => String(e.target)),
            edges.map(e => Number(e.weight)),
            edges.map(e => Boolean(e.bidirectional))
        );
    }, []);

    const step = useCallback(() => engineRef.current?.step(), []);
    const getNodeIds = useCallback(() => { const v = engineRef.current?.getNodeIds(); return v ? [...v] : []; }, []);
    const getX = useCallback(() => { const v = engineRef.current?.getX(); return v ? [...v] : []; }, []);
    const getY = useCallback(() => { const v = engineRef.current?.getY(); return v ? [...v] : []; }, []);
    const getRadii = useCallback(() => { const v = engineRef.current?.getRadii(); return v ? [...v] : []; }, []);
    const hitTest = useCallback((sx: number, sy: number, px: number, py: number, z: number, w: number, h: number) => 
        engineRef.current?.hitTest(sx, sy, px, py, z, w, h) ?? -1, []);
    const setDrag = useCallback((id: string) => engineRef.current?.setDrag(String(id)), []);
    const updateDrag = useCallback((wx: number, wy: number) => engineRef.current?.updateDrag(wx, wy), []);
    const clearDrag = useCallback(() => engineRef.current?.clearDrag(), []);

    return { ready, initGraph, step, getNodeIds, getX, getY, getRadii, hitTest, setDrag, updateDrag, clearDrag };
}