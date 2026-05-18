import { useRef, useCallback, useEffect } from 'react';

export function useStableGraphLayout(
  step: () => void,
  getNodeIds: () => string[],
  getX: () => number[],
  getY: () => number[],
  getRadii: () => number[],
  isStable: () => boolean
) {
  const stablePositionsRef = useRef<{
    ids: string[];
    xs: number[];
    ys: number[];
    radii: number[];
  } | null>(null);
  
  const animationRef = useRef<number | null>(null);
  const isStableRef = useRef(false);
  const isInteractingRef = useRef(false);
  
  const stabilize = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (isStableRef.current) {
      stablePositionsRef.current = {
        ids: getNodeIds(),
        xs: getX(),
        ys: getY(),
        radii: getRadii(),
      };
    }
  }, [getNodeIds, getX, getY, getRadii]);
  
  const startInteraction = useCallback(() => {
    isInteractingRef.current = true;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);
  
  const endInteraction = useCallback(() => {
    isInteractingRef.current = false;
    isStableRef.current = false;
    
    const animate = () => {
      if (!isStableRef.current && isInteractingRef.current === false) {
        step();
        
        if (isStable()) {
          isStableRef.current = true;
          stabilize();
          return;
        }
        
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [step, isStable, stabilize]);
  
  const getStablePositions = useCallback(() => {
    return stablePositionsRef.current;
  }, []);
  
  const resetStable = useCallback(() => {
    stablePositionsRef.current = null;
    isStableRef.current = false;
    isInteractingRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    const animate = () => {
      if (!isStableRef.current && !isInteractingRef.current) {
        step();
        
        if (isStable()) {
          isStableRef.current = true;
          stabilize();
          return;
        }
        
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [step, isStable, stabilize]);
  
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return {
    startInteraction,
    endInteraction,
    getStablePositions,
    resetStable,
    isStable: isStableRef.current,
  };
}