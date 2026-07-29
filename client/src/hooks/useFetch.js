// useFetch — a tiny data-fetching hook so pages don't repeat the
// loading/error/refetch boilerplate. Pass an async function that returns an
// Axios response; the hook unwraps `response.data` for you.
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @param {Function} fetcher - async () => axiosResponse
 * @param {Array} deps - re-run when these change (like useEffect deps)
 * @returns {{ data, loading, error, refetch }}
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Monotonic id per request: a response only lands if it is still the latest,
  // so a slow older request can't overwrite a newer one (or an unmounted tree).
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (id === requestId.current) setData(res.data);
    } catch (err) {
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
    // Invalidate in-flight requests on unmount / deps change. The ref object
    // itself is stable for the component's lifetime, so capturing it here (as
    // the exhaustive-deps rule asks) is safe and keeps the bump correct.
    const idRef = requestId;
    return () => {
      idRef.current++;
    };
  }, [run]);

  return { data, loading, error, refetch: run };
}
