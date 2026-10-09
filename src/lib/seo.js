/**
 * setPageSEO — sets the document title and meta description for a page.
 * Call from a page's useEffect on mount.
 */
export function setPageSEO(title, description) {
  document.title = title;
  if (description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }
}