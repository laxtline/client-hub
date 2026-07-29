// useDebounce — returns a copy of `value` that only updates after the user has
// stopped changing it for `delay` ms.
//
// WHY: the client search box drives a `useFetch` dependency, so typing
// "Stark Industries" previously fired 16 API calls and re-rendered the table on
// every keystroke. Debouncing collapses that to one request.
import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Each new keystroke cancels the previous pending update.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
