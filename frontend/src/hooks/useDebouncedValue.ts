import { useEffect, useState } from 'react';

export function useDebouncedValue<Value>(value: Value, delayInMilliseconds: number): Value {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayInMilliseconds);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayInMilliseconds]);
  return debouncedValue;
}
