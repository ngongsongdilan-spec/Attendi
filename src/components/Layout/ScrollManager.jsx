import { useLayoutEffect, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Scroll positions for the app's dedicated scroll container, keyed by the
// history entry (location.key) so Back/Forward can restore them.
const scrollPositions = new Map();

// The app scrolls inside a dedicated container (see `.app-scroll`), not the
// window, so we must track that element rather than only window.scrollY.
const resolveScrollTarget = () => {
  if (typeof document === 'undefined') return null;
  return (
    document.querySelector('.app-scroll') ||
    document.scrollingElement ||
    document.documentElement
  );
};

/**
 * Keeps track of the scroll position of the app's scroll container.
 *
 * - Tab switches within a page are local state changes: the location does not
 *   change, so this component does nothing and the position is preserved.
 * - Returning through browser history (POP) restores the saved position.
 * - Normal navigation is left to the browser's own preservation of the
 *   container's scrollTop; we never force a global reset to the top.
 */
const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const currentKey = useRef(location.key);

  currentKey.current = location.key;

  // Restore saved position when navigating through history (Back/Forward).
  // useLayoutEffect runs after the new route has been committed but before the
  // browser paints, so there is no flicker or visible jump.
  useLayoutEffect(() => {
    if (navigationType !== 'POP') return;
    const target = resolveScrollTarget();
    if (!target) return;
    const saved = scrollPositions.get(location.key);
    if (saved != null) {
      target.scrollTop = saved;
    }
  }, [location.key, navigationType]);

  // Continuously record the container's scroll position for the active history
  // entry. A single listener (re-keyed via the ref) avoids ordering problems
  // when the location changes.
  useEffect(() => {
    const target = resolveScrollTarget();
    if (!target) return undefined;

    const record = () => {
      scrollPositions.set(currentKey.current, target.scrollTop);
    };

    record();
    target.addEventListener('scroll', record, { passive: true });
    return () => target.removeEventListener('scroll', record);
  }, []);

  return null;
};

export default ScrollManager;
