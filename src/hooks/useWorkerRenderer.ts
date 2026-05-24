import { useEffect, useRef, useCallback, useState } from "react";

export function useWorkerRenderer() {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const renderCallbackRef = useRef<((imageBitmap: ImageBitmap) => void) | null>(
    null,
  );
  const sharedBufferRef = useRef<ArrayBuffer | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("./graphWorker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "RENDER_COMPLETE" && renderCallbackRef.current) {
        renderCallbackRef.current(payload.imageBitmap);
      }
    };

    worker.onerror = (error) => console.error("Worker error:", error);
    setIsWorkerReady(true);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const initSharedBuffer = useCallback((nodeCount: number) => {
    if (!workerRef.current) return null;
    
    const buffer = new ArrayBuffer(nodeCount * 3 * 4);
    sharedBufferRef.current = buffer;
    
    workerRef.current.postMessage({
      type: "INIT",
      payload: { buffer, nodeCount },
    }, [buffer]);
    
    return new Float32Array(buffer);
  }, []);

  const updatePositions = useCallback(
    (xs: number[], ys: number[], radii: number[]) => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({
        type: "UPDATE_POSITIONS",
        payload: { xs, ys, radii },
      });
    },
    [],
  );

  const renderGraph = useCallback(
    (data: any, callback: (imageBitmap: ImageBitmap) => void) => {
      if (!workerRef.current || !isWorkerReady) return;
      renderCallbackRef.current = callback;
      const serializableData = {
        ...data,
        semanticMap: Array.from(data.semanticMap.entries()),
        recommendationSet: Array.from(data.recommendationSet),
      };
      workerRef.current.postMessage({
        type: "RENDER",
        payload: serializableData,
      });
    },
    [isWorkerReady],
  );

  return { renderGraph, isWorkerReady, initSharedBuffer, updatePositions };
}