"use client";

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'product-grid-columns';
const DEFAULT_COLUMNS = 5;

export function useColumnSettings() {
  const [columns, setColumns] = useState<number>(DEFAULT_COLUMNS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from LocalStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 2 && parsed <= 6) {
        setColumns(parsed);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateColumns = (newColumns: number) => {
    setColumns(newColumns);
    localStorage.setItem(STORAGE_KEY, newColumns.toString());
  };

  return {
    columns,
    setColumns: updateColumns,
    isLoaded
  };
}
