import { format } from 'date-fns';
import { Pencil, Trash2, EyeOff, Eye, User, ArrowRight, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

// Priority based on content length / recency
function getPriority(entry: EntryWithCategory): { label: string; color: string } {
  const len = entry.content.length;
  if (len > 500) return { label: 'HIGH', color: 'bg-[hsl(180,100%,50%)] text-[hsl(220,80%,10%)]' };
  if (len > 200) return { label: 'MEDIUM', color: 'bg-[hsl(270,60%,60%)] text-[hsl(0,0%,100%)]' };
  return { label: 'LOW', color: 'bg-[hsl(220,30%,40%)] text-[hsl(0,0%,80%)]' };
}

// Simulated progress based on content completeness
function getProgress(entry: EntryWithCategory): number {
  const len = entry.content.length;
  if (len > 800) return Math.min(95, 70 + Math.floor(len / 100));
  if (len > 300) return Math.min(70, 40 + Math.floor(len / 20));
  return Math.min(40, 10 + Math.floor(len / 10));
}

// Simulated read count from hash
function getReadCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return Math.abs(hash % 500) + 10;
}

// Emoji mapper
function getCategoryEmoji(categoryName?: string): string {
  if (!categoryName) return '📝';
  const map: Record<string, string> = {
    '技术开发': '💻', '产品设计': '🎨', '运营管理': '📊',
    '学习笔记': '📚', '新闻时事': '📰',
  };
  return map[categoryName] || '📝';
}

// ======= BENTO GLASS (Cyberpunk) =======
function BentoGlassCard({ entry, onClick, isManageMode, canManage, isOwn, onEdit, onDelete, onToggleVisibility, index = 0 }: EntryCardProps) {
  const isLarge = index === 0;
  const priority = getPriority(entry);
  const progress = getProgress(entry);
  const reads = getReadCount(entry.id);
  const tags = entry.content.match(/[A-Za-z\u4e00-\u9fff]+/g)?.slice(0, 3).map(t => t.toUpperCase().slice(0, 8)) || [];

  return (
    <div
      className={`group relative cursor-pointer p-5 transition-all duration-300 hover:scale-[1.01]
        bg-[hsl(220,40%,8%)/0.8] backdrop-blur-xl
        cyber-border cyber-border-bottom
        ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
      onClick={onClick}
    >
      {isManageMode && canManage && (
        <ManageOverlay isPrivate={entry.is_private} onToggleVisibility={onToggleVisibility} onEdit={onEdit} onDelete={onDelete} />
      )}

      {/* Top row: priority + own badge + activity icon */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 ${priority.color}`}>
          {priority.label}
        </span>
        {isOwn && (
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 border border-[hsl(180,100%,50%/0.4)] text-[hsl(180,100%,70%)]">
            PERSONAL
          </span>
        )}
        {entry.is_private && (
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 border border-[hsl(0,70%,50%/0.4)] text-[hsl(0,70%,60%)]">
            PRIVATE
          </span>
        )}
        <div className="ml-auto">
          <Activity className="h-4 w-4 text-[hsl(180,100%,50%/0.7)]" />
        </div>
      </div>

      {/* Category + tags */}
      <div className="flex items-center gap-1.5 mb-2 text-[10px] tracking-widest text-[hsl(180,80%,60%)] uppercase font-mono">
        <span>{entry.categories?.name || '未知分类'}</span>
        {tags.slice(0, 2).map((t, i) => (
          <span key={i}>· {t}</span>
        ))}
      </div>

      {/* Title */}
      <h3 className={`font-black mb-2 leading-tight text-[hsl(0,0%,95%)] cyber-glow ${isLarge ? 'text-3xl' : 'text-lg'}`}>
        {entry.title}
      </h3>

      {/* Snippet */}
      <p className={`text-sm text-[hsl(210,20%,68%)] ${isLarge ? 'line-clamp-3' : 'line-clamp-2'} mb-4 font-mono`}>
        {snippet(entry.content)}
      </p>

      {/* Large card: circular progress + reads */}
      {isLarge && (
        <div className="flex items-center gap-6 mb-4">
          {/* Circular progress */}
          <div className="relative h-16 w-16 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="hsl(220 30% 20%)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="hsl(180 100% 50%)" strokeWidth="3"
                strokeDasharray={`${progress}, 100`}
                className="drop-shadow-[0_0_6px_hsl(180,100%,50%/0.5)]" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[hsl(180,100%,60%)]">
              {progress}%
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[hsl(210,20%,60%)] uppercase tracking-widest">完成度</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-black text-[hsl(180,100%,60%)] font-mono tracking-tight">{reads}</p>
            <p className="text-[10px] text-[hsl(210,20%,60%)] uppercase tracking-widest">READS</p>
          </div>
        </div>
      )}

      {/* Progress bar (small cards) */}
      {!isLarge && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest text-[hsl(210,20%,45%)] font-mono">PROGRESS</span>
            <span className="text-[10px] font-bold text-[hsl(180,100%,60%)]">{progress}%</span>
          </div>
          <div className="h-1 bg-[hsl(220,30%,15%)] rounded-full overflow-hidden">
            <div className="h-full cyber-progress rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Bottom: timestamp + status + reads */}
      <div className="flex items-center justify-between border-t border-[hsl(180,100%,50%/0.1)] pt-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[hsl(180,80%,50%)] animate-pulse-cyber">●</span>
          <span className="text-[hsl(180,80%,50%)] text-[10px] font-mono uppercase tracking-wider">
            ACTIVE
          </span>
          <span className="text-[10px] text-[hsl(210,20%,40%)] font-mono">
            {format(new Date(entry.created_at), 'yyyy-MM-dd · HH:mm')}
          </span>
        </div>
        {!isLarge && (
          <div className="flex items-center gap-1.5 text-[hsl(210,20%,45%)]">
            <Activity className="h-3 w-3" />
            <span className="text-[10px] font-mono">{reads}</span>
          </div>
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

// Main export
export function EntryCard(props: EntryCardProps) {
  const style = props.layoutStyle || 'bento-glass';
  switch (style) {
    case 'bento-glass': return <BentoGlassCard {...props} />;
    case 'dark-editorial': return <DarkEditorialCard {...props} />;
    case 'neubrutalism': return <NeubrutalismCard {...props} />;
    default: return <BentoGlassCard {...props} />;
  }
}
