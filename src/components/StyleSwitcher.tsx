import type { LayoutStyle, DrawerSide } from '@/hooks/useLayoutStyle';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface StyleSwitcherProps {
  current: LayoutStyle;
  onChange: (style: LayoutStyle) => void;
  drawerSide: DrawerSide;
  onDrawerSideChange: (side: DrawerSide) => void;
}

const styles: { key: LayoutStyle; label: string; desc: string }[] = [
  { key: 'bento-glass', label: 'Bento Glass', desc: '渐变玻璃 · 格子布局' },
  { key: 'dark-editorial', label: 'Dark Editorial', desc: '暗黑杂志 · 列表风格' },
  { key: 'neubrutalism', label: 'Neubrutalism', desc: '新野兽派 · 大胆配色' },
];

const sides: { key: DrawerSide; icon: typeof ArrowLeft; label: string }[] = [
  { key: 'left', icon: ArrowRight, label: '←' },
  { key: 'right', icon: ArrowLeft, label: '→' },
  { key: 'top', icon: ArrowDown, label: '↑' },
  { key: 'bottom', icon: ArrowUp, label: '↓' },
];

export function StyleSwitcher({ current, onChange, drawerSide, onDrawerSideChange }: StyleSwitcherProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Layout style */}
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

      {/* Drawer direction */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
          抽屉
        </span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {sides.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                onClick={() => onDrawerSideChange(s.key)}
                title={`从${s.key === 'left' ? '左' : s.key === 'right' ? '右' : s.key === 'top' ? '上' : '下'}侧弹出`}
                className={`px-2.5 py-1.5 text-xs transition-colors flex items-center gap-1 ${
                  drawerSide === s.key
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
