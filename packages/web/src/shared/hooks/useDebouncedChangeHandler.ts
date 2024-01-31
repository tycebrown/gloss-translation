import { useRef } from 'react';

export function useDebouncedChangeHandler<T>(
  handler: (value: T) => void,
  ms: number
) {
  const oldValue = useRef<T>();
  const currentTimeout = useRef<ReturnType<typeof setTimeout>>();

  return (value: T) => {
    if (value !== oldValue.current) {
      oldValue.current = value;
      clearTimeout(currentTimeout.current);
      currentTimeout.current = setTimeout(() => handler(value), ms);
    }
  };
}
