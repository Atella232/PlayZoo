import { useEffect, useState } from 'react';

export function currentPath(): string {
  return location.hash.replace(/^#/, '').split('?')[0] || '/';
}

export function navigate(path: string) {
  if (currentPath() === path) return;
  location.hash = path;
}

export function back(fallback = '/') {
  if (history.length > 1) history.back();
  else navigate(fallback);
}

export function usePath(): string {
  const [p, setP] = useState(currentPath());
  useEffect(() => {
    const on = () => setP(currentPath());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return p;
}
