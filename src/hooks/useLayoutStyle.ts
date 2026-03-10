import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type LayoutStyle = 'bento-glass' | 'dark-editorial' | 'neubrutalism';

const STORAGE_KEY = 'preferred-layout-style';

export function useLayoutStyle() {
  const { user } = useAuth();
  const [style, setStyleState] = useState<LayoutStyle>(() => {
    return (localStorage.getItem(STORAGE_KEY) as LayoutStyle) || 'dark-editorial';
  });
  const [loaded, setLoaded] = useState(false);

  // Load from DB for logged-in users
  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    supabase
      .from('profiles')
      .select('preferred_style')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.preferred_style) {
          const s = data.preferred_style as LayoutStyle;
          setStyleState(s);
          localStorage.setItem(STORAGE_KEY, s);
        }
        setLoaded(true);
      });
  }, [user]);

  const setStyle = useCallback((newStyle: LayoutStyle) => {
    setStyleState(newStyle);
    localStorage.setItem(STORAGE_KEY, newStyle);
    if (user) {
      supabase
        .from('profiles')
        .update({ preferred_style: newStyle } as any)
        .eq('id', user.id)
        .then(() => {});
    }
  }, [user]);

  return { style, setStyle, loaded };
}

// Card color palette for Neubrutalism style
const CARD_COLORS = [
  'hsl(50 100% 85%)',   // yellow
  'hsl(160 60% 80%)',   // mint
  'hsl(270 60% 85%)',   // lavender
  'hsl(350 70% 88%)',   // pink
  'hsl(200 70% 85%)',   // sky
  'hsl(30 80% 85%)',    // peach
];

export function getCardColor(index: number): string {
  return CARD_COLORS[index % CARD_COLORS.length];
}
