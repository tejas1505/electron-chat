import { useState, useEffect, useRef } from 'react';
import { usersApi } from '@/services/users';
import type { User } from '@electron-chat/types';

export function useUserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (cancelledRef.current) return;
      setIsLoading(true);
      try {
        const users = await usersApi.search(query);
        if (!cancelledRef.current) setResults(users);
      } catch {
        if (!cancelledRef.current) setResults([]);
      } finally {
        if (!cancelledRef.current) setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelledRef.current = true;
      clearTimeout(debounceRef.current);
    };
  }, [query]);

  const reset = () => {
    setQuery('');
    setResults([]);
    setIsLoading(false);
  };

  return { query, setQuery, results, isLoading, reset };
}
