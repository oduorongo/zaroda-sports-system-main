import { useEffect } from 'react';

export const useNoindex = () => {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }

    const previous = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (created) {
        meta?.remove();
        return;
      }

      if (previous == null) {
        meta?.removeAttribute('content');
      } else {
        meta?.setAttribute('content', previous);
      }
    };
  }, []);
};
