import { useCallback, useEffect, useRef, useState } from 'react';

export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(abortController.signal);
      if (id === requestId.current && !abortController.signal.aborted) {
        setData(res.data);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (id === requestId.current) {
        setError(err.response?.data?.message || err.message || 'Something went wrong');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [run]);

  return { data, loading, error, refetch: run };
}
