import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value with a delay
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 500)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
