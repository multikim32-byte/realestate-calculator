import { useState, useEffect, useCallback } from 'react';

export interface Favorite {
  id: string;
  type: 'sale' | 'unsold';
  name: string;
  location: string;
  savedAt: string;
  receiptStart?: string;
}

const KEY = 'mk_favorites';

function load(): Favorite[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function save(items: Favorite[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); }
  catch {}
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => { setFavorites(load()); }, []);

  const toggle = useCallback((item: Omit<Favorite, 'savedAt'>) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id && f.type === item.type);
      const next = exists
        ? prev.filter(f => !(f.id === item.id && f.type === item.type))
        : [...prev, { ...item, savedAt: new Date().toISOString() }];
      save(next);
      return next;
    });
  }, []);

  const isFav = useCallback((id: string, type: 'sale' | 'unsold') =>
    favorites.some(f => f.id === id && f.type === type)
  , [favorites]);

  return { favorites, toggle, isFav };
}
