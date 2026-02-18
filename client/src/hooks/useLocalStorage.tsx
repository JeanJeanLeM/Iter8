/* `useLocalStorage`
 *
 * Features:
 *  - JSON Serializing
 *  - Also value will be updated everywhere, when value updated (via `storage` event)
 */

import { useEffect, useState } from 'react';

export default function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState(defaultValue);

  function safeParse(stored: string | null): T {
    if (stored == null || stored === '') {
      return defaultValue;
    }
    if (stored === 'undefined') {
      return defaultValue;
    }
    try {
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  }

  useEffect(() => {
    const item = localStorage.getItem(key);

    if (!item || item === 'undefined') {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }

    setValue(safeParse(item));

    function handler(e: StorageEvent) {
      if (e.key !== key) {
        return;
      }

      const lsi = localStorage.getItem(key);
      setValue(safeParse(lsi));
    }

    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener('storage', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValueWrap = (value: T) => {
    try {
      const toStore = value === undefined ? defaultValue : value;
      setValue(toStore);
      localStorage.setItem(key, JSON.stringify(toStore));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return [value, setValueWrap];
}
