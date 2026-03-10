import { format } from 'date-fns';
import { Pencil, Trash2, EyeOff, Eye, User, FileText, Tag, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EntryWithCategory } from '@/hooks/useEntries';
import type { LayoutStyle } from '@/hooks/useLayoutStyle';
import { getCardColor } from '@/hooks/useLayoutStyle';

interface EntryCardProps {
  entry: EntryWithCategory;
  onClick?: () => void;
  isManageMode?: boolean;
  canManage?: boolean;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
  layoutStyle?: LayoutStyle;
  index?: number;
}

function ManageOverlay({ isPrivate, onToggleVisibility, onEdit, onDelete }: {
  isPrivate: boolean;
  onToggleVisibility?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button size="icon" variant="secondary" className="h-7 w-7"
        onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); }}
        title={isPrivate ? '设为公开' : '设为私密'}>
        {isPrivate ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="secondary" className="h-7 w-7"
        onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="secondary" className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function OwnBadge({ variant }: { variant: 'default' | 'corner' | 'inline' }) {
  if (variant === 'corner') {
    return (
      <div className="absolute top-0 left-0 z-10">
        <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-[calc(var(--radius)-1px)] flex items-center gap-1">
          <User className="h-3 w-3" />我的
        </div>
      </div>
    );
  }
  return (
    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
      <User className="h-3 w-3" />我的
    </Badge>
  );
}

const snippet = (content: string) =>
  content.replace(/[#*`~\[\]>!|-]/g, '').replace(/\n/g, ' ').trim();

// ======= BENTO GLASS =======
function BentoGlassCard({ entry, onClick, isManageMode, canManage, isOwn, onEdit, onDelete, onToggleVisibility, index = 0 }: EntryCardProps) {
  const isLarge = index === 0;
  return (
    <div
      className={`group relative cursor-pointer rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]
        backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 dark:from-cyan-400/10 dark:to-blue-900/5
        border border-cyan-300/20 dark:border-cyan-500/15 shadow-lg shadow-cyan-500/5 hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-300/40
        ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
      onClick={onClick}
    >
      {isOwn && <OwnBadge variant="corner" />}
      {isManageMode && canManage && (
        <ManageOverlay isPrivate={entry.is_private} onToggleVisibility={onToggleVisibility} onEdit={onEdit} onDelete={onDelete} />
      )}

      <div className="text-3xl mb-3">
        {getCategoryEmoji(entry.categories?.name)}
      </div>

      <Badge className="mb-2 bg-cyan-500/15 dark:bg-cyan-400/10 text-foreground border border-cyan-400/20 text-[11px]">
        {entry.categories?.name || '未知分类'}
      </Badge>

      <h3 className={`font-bold mb-2 leading-tight ${isLarge ? 'text-2xl' : 'text-lg'}`}>
        {entry.title}
      </h3>

      <p className={`text-sm text-muted-foreground ${isLarge ? 'line-clamp-4' : 'line-clamp-2'} mb-4`}>
        {snippet(entry.content)}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-muted-foreground">
          {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
        {entry.is_private && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <EyeOff className="h-3 w-3" />私密
          </Badge>
        )}
      </div>
    </div>
  );
}

// ======= DARK EDITORIAL =======
function DarkEditorialCard({ entry, onClick, isManageMode, canManage, isOwn, onEdit, onDelete, onToggleVisibility, index = 0 }: EntryCardProps) {
  return (
    <div
      className="group relative cursor-pointer rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30"
      onClick={onClick}
    >
      {isManageMode && canManage && (
        <ManageOverlay isPrivate={entry.is_private} onToggleVisibility={onToggleVisibility} onEdit={onEdit} onDelete={onDelete} />
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getCategoryEmoji(entry.categories?.name)}</span>
        <Badge variant="outline" className="text-[10px]">
          {entry.categories?.name || '未知分类'}
        </Badge>
        {isOwn && <OwnBadge variant="inline" />}
        {entry.is_private && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <EyeOff className="h-3 w-3" />私密
          </Badge>
        )}
      </div>

      <h3 className="font-bold text-base mb-1 line-clamp-1">{entry.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {snippet(entry.content).slice(0, 100)}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}</span>
        <span className="text-2xl font-black text-primary/30 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

// ======= NEUBRUTALISM =======
function NeubrutalismCard({ entry, onClick, isManageMode, canManage, isOwn, onEdit, onDelete, onToggleVisibility, index = 0 }: EntryCardProps) {
  const color = getCardColor(index);

  return (
    <div
      className="group relative cursor-pointer rounded-xl border-2 border-foreground/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--foreground))]"
      style={{ backgroundColor: color }}
      onClick={onClick}
    >
      {isManageMode && canManage && (
        <ManageOverlay isPrivate={entry.is_private} onToggleVisibility={onToggleVisibility} onEdit={onEdit} onDelete={onDelete} />
      )}

      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{getCategoryEmoji(entry.categories?.name)}</span>
        {isOwn && <OwnBadge variant="inline" />}
      </div>

      <Badge className="mb-2 bg-foreground/80 text-background text-[11px] border-0 rounded-sm">
        {entry.categories?.name || '未知分类'}
      </Badge>

      <h3 className="font-black text-xl text-foreground/90 mb-2 leading-tight line-clamp-2">
        {entry.title}
      </h3>

      <p className="text-sm text-foreground/60 line-clamp-2 mb-4">
        {snippet(entry.content)}
      </p>

      <div className="border-t border-foreground/20 pt-3 flex items-center justify-between">
        <span className="text-xs text-foreground/50">
          {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
        </span>
        <div className="flex items-center gap-2">
          {entry.is_private && (
            <Badge variant="outline" className="text-[10px] gap-0.5 border-foreground/30">
              <EyeOff className="h-3 w-3" />私密
            </Badge>
          )}
          <div className="h-7 w-7 rounded-md bg-foreground/80 text-background flex items-center justify-center">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Emoji mapper for visual interest
function getCategoryEmoji(categoryName?: string): string {
  if (!categoryName) return '📝';
  const map: Record<string, string> = {
    '技术开发': '💻',
    '产品设计': '🎨',
    '运营管理': '📊',
    '学习笔记': '📚',
    '新闻时事': '📰',
  };
  return map[categoryName] || '📝';
}

// Main export that delegates to the right style
export function EntryCard(props: EntryCardProps) {
  const style = props.layoutStyle || 'bento-glass';

  switch (style) {
    case 'bento-glass':
      return <BentoGlassCard {...props} />;
    case 'dark-editorial':
      return <DarkEditorialCard {...props} />;
    case 'neubrutalism':
      return <NeubrutalismCard {...props} />;
    default:
      return <BentoGlassCard {...props} />;
  }
}
