import { Button } from '@/components/ui/button';
import type { LayoutStyle } from '@/hooks/useLayoutStyle';

interface StyleSwitcherProps {
  current: LayoutStyle;
  onChange: (style: LayoutStyle) => void;
}

const styles: { key: LayoutStyle; label: string; desc: string }[] = [
  { key: 'bento-glass', label: 'Bento Glass', desc: '渐变玻璃 · 格子布局' },
  { key: 'dark-editorial', label: 'Dark Editorial', desc: '暗黑杂志 · 列表风格' },
  { key: 'neubrutalism', label: 'Neubrutalism', desc: '新野兽派 · 大胆配色' },
];

export function StyleSwitcher({ current, onChange }: StyleSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
        Style
      </span>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {styles.map((s) => (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              current === s.key
                ? 'bg-primary text-primary-foreground font-bold'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            <span className="block">{s.label}</span>
            <span className="block text-[9px] opacity-70 hidden sm:block">{s.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
