import { useState, useCallback } from 'react';

export interface AppState {
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'status';
  filter: {
    status: string[];
    type: string[];
    environment: string[];
  };
}

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
};

export const useAppState = () => {
  const [state, setState] = useLocalStorage<AppState>('app-state', {
    viewMode: 'grid',
    sortBy: 'name',
    filter: {
      status: [],
      type: [],
      environment: [],
    },
  });

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, [setState]);

  return { state, updateState };
};