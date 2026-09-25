export const HISTORY_GUARD = `(() => {
  const hiddenAttribute = 'data-pawpaw-private-hidden';
  const isProtectedPath = () => {
    let path = window.location.pathname;
    try { path = decodeURIComponent(path); } catch {}
    const family = path === '/' || path === '/first-days' || path === '/chapters' || path.startsWith('/chapters/');
    return family || (path.startsWith('/admin') && path !== '/admin/login');
  };
  const hide = () => document.documentElement.setAttribute(hiddenAttribute, '');
  const reveal = () => document.documentElement.removeAttribute(hiddenAttribute);
  const isHistoryTraversal = () => {
    const entry = performance.getEntriesByType('navigation')[0];
    return entry && entry.type === 'back_forward';
  };
  const revalidateHistoryEntry = (persisted) => {
    if (!isProtectedPath()) {
      reveal();
      return;
    }
    if (persisted || isHistoryTraversal()) {
      hide();
      try { sessionStorage.setItem('pawpaw-restore', window.location.pathname); } catch {}
      window.location.replace(window.location.href);
      return;
    }
    reveal();
  };

  if (isProtectedPath() && isHistoryTraversal()) {
    hide();
    try { sessionStorage.setItem('pawpaw-restore', window.location.pathname); } catch {}
    window.location.replace(window.location.href);
  } else {
    reveal();
  }

  window.addEventListener('pagehide', () => {
    if (isProtectedPath()) hide();
  });
  window.addEventListener('pageshow', (event) => {
    revalidateHistoryEntry(event.persisted);
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const action = new URL(form.action, window.location.href).pathname;
    if (action === '/logout/viewer' || action === '/logout/admin') hide();
  }, true);
})();`

export default function PrivateHistoryGuard() {
  return (
    <>
      <style>{'html[data-pawpaw-private-hidden] body { visibility: hidden !important; }'}</style>
      <script dangerouslySetInnerHTML={{ __html: HISTORY_GUARD }} />
    </>
  )
}
