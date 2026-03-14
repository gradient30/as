import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Pencil, Trash2, Share2, EyeOff, Eye, Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { useState } from 'react';
import { Type } from 'lucide-react';
import type { EntryWithCategory } from '@/hooks/useEntries';
import { useToggleEntryVisibility } from '@/hooks/useEntries';
import type { LayoutStyle } from '@/hooks/useLayoutStyle';
import { getCardColor } from '@/hooks/useLayoutStyle';

type SheetSide = 'left' | 'right' | 'top' | 'bottom';

interface EntryDetailProps {
  entry: EntryWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  layoutStyle?: LayoutStyle;
  cardIndex?: number;
  drawerSide?: SheetSide;
}

function getShareUrl(entry: EntryWithCategory) {
  const base = 'https://osb.996fb.cn';
  let url = `${base}/?entry=${entry.id}`;
  if (entry.is_private && entry.share_token) {
    url += `&share=${entry.share_token}`;
  }
  return url;
}

function getShareText(entry: EntryWithCategory) {
  const snippet = entry.content.replace(/[#*`~\[\]>!|-]/g, '').replace(/\n/g, ' ').trim().slice(0, 100);
  return `【${entry.title}】${snippet}...`;
}

function getCategoryEmoji(name?: string): string {
  if (!name) return '📄';
  const map: Record<string, string> = {
    '技术开发': '💻', '产品设计': '🎨', '运营增长': '📈', '学习笔记': '📝',
    '创意灵感': '💡', '行业资讯': '📰', '工具推荐': '🔧', '管理': '👔',
  };
  return map[name] || '📄';
}

/* ── Responsive size classes based on drawer side ── */
function getSizeClasses(side: SheetSide): string {
  if (side === 'top' || side === 'bottom') {
    return 'h-[70vh] sm:h-[60vh] w-full';
  }
  return 'w-full sm:w-[65vw] md:w-[55vw] lg:w-[50vw] xl:w-[45vw] min-w-[33vw] max-w-[900px]';
}

const PROSE_SIZE_CLASSES = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl'];
const FONT_LABELS = ['A', 'A', 'A', 'A'];

function FontSizeControl({ fontSize, setFontSize, variant = 'default' }: { fontSize: number; setFontSize: (v: number) => void; variant?: 'default' | 'neu' }) {
  return (
    <div className="flex items-center gap-0.5">
      <Type className="h-3.5 w-3.5 text-muted-foreground mr-1" />
      {FONT_LABELS.map((label, i) => (
        <button
          key={i}
          onClick={() => setFontSize(i)}
          className={`w-6 h-6 flex items-center justify-center font-bold rounded transition-all text-xs ${
            fontSize === i
              ? variant === 'neu'
                ? 'bg-foreground/80 text-background'
                : 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          style={{ fontSize: `${10 + i * 2}px` }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SharePopover({ entry, shareOpen, setShareOpen }: { entry: EntryWithCategory; shareOpen: boolean; setShareOpen: (v: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(entry);
  const shareText = getShareText(entry);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('复制失败'); }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('内容和链接已复制');
    } catch { toast.error('复制失败'); }
  };

  return (
    <Popover open={shareOpen} onOpenChange={setShareOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">分享到</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
              onClick={() => navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => toast.success('内容已复制，请打开微信粘贴分享'))}>
              <MessageCircle className="h-3.5 w-3.5" />微信
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
              onClick={() => window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(entry.title)}&summary=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=500')}>
              QQ
            </Button>
            <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
              onClick={() => navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => { toast.success('内容已复制，正在打开小红书...'); window.open('https://www.xiaohongshu.com', '_blank'); })}>
              小红书
            </Button>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">分享链接</p>
            <div className="flex gap-1.5">
              <Input value={shareUrl} readOnly className="h-8 text-xs" onFocus={(e) => e.target.select()} />
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCopyLink}>
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1 gap-1.5 text-xs" onClick={handleCopyAll}>
              <Copy className="h-3.5 w-3.5" />复制内容+链接
            </Button>
            <Button size="sm" variant="secondary" className="flex-1 gap-1.5 text-xs"
              onClick={() => window.open(shareUrl, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />新窗口打开
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Action buttons row (shared across styles) ── */
function ActionButtons({ entry, canManage, onEdit, onDelete, onClose, layoutStyle }: {
  entry: EntryWithCategory; canManage?: boolean; onEdit?: () => void; onDelete?: () => void;
  onClose: () => void; layoutStyle?: LayoutStyle;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const toggleVisibility = useToggleEntryVisibility();

  const isNeu = layoutStyle === 'neubrutalism';
  const btnVariant = isNeu ? 'outline' as const : 'ghost' as const;
  const btnClass = isNeu ? 'h-8 w-8 border-2 border-foreground/80 rounded-md' : 'h-8 w-8';
  const deleteClass = isNeu
    ? 'h-8 w-8 border-2 border-foreground/80 rounded-md text-destructive hover:text-destructive'
    : 'h-8 w-8 text-destructive hover:text-destructive';

  return (
    <div className="flex gap-1 shrink-0">
      <SharePopover entry={entry} shareOpen={shareOpen} setShareOpen={setShareOpen} />
      {canManage && (
        <>
          <Button size="icon" variant={btnVariant} className={btnClass}
            onClick={() => toggleVisibility.mutate({ id: entry.id, is_private: !entry.is_private })}
            disabled={toggleVisibility.isPending}
            title={entry.is_private ? '设为公开' : '设为私密'}>
            {entry.is_private ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant={btnVariant} className={btnClass} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant={btnVariant} className={deleteClass}
            onClick={() => { onDelete?.(); onClose(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button size="icon" variant={btnVariant} className={btnClass} onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EDITORIAL STYLE — right drawer, white, thin borders, light shadow
   ═══════════════════════════════════════════════ */
function EditorialDetail({ entry, open, onOpenChange, canManage, onEdit, onDelete, drawerSide = 'right' }: Omit<EntryDetailProps, 'layoutStyle' | 'cardIndex'>) {
  const [fontSize, setFontSize] = useState(1);
  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={drawerSide} className={`${getSizeClasses(drawerSide)} p-0 border-border/60 shadow-xl overflow-y-auto [&>button]:hidden`}>
        {/* Clean header with thin bottom border */}
        <div className="px-6 pt-6 pb-4 border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {entry.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {entry.categories && (
                  <span className="text-primary font-medium">{entry.categories.name}</span>
                )}
                <span>{format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}</span>
                {entry.contributors.length > 1 && (
                  <span>· {entry.contributors.length} 位贡献者</span>
                )}
                {entry.is_private && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 h-5">
                    <EyeOff className="h-3 w-3" />私密
                  </Badge>
                )}
              </div>
            </div>
            <ActionButtons entry={entry} canManage={canManage} onEdit={onEdit} onDelete={onDelete} onClose={() => onOpenChange(false)} layoutStyle="dark-editorial" />
          </div>
          <div className="mt-3 flex justify-end">
            <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} />
          </div>
        </div>
        {/* Content area */}
        <div className="px-6 py-5">
          <MarkdownRenderer content={entry.content} proseSize={PROSE_SIZE_CLASSES[fontSize]} />
        </div>
        {/* Minimal footer line */}
        <div className="px-6 pb-6">
          <div className="border-t border-border/30 pt-3 flex items-center justify-center">
            <span className="text-[10px] tracking-[0.3em] text-muted-foreground/40 uppercase">end of document</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════
   NEUBRUTALISM STYLE — right drawer, colored header, thick border, hard shadow
   ═══════════════════════════════════════════════ */
function NeuDetail({ entry, open, onOpenChange, canManage, onEdit, onDelete, cardIndex = 0, drawerSide = 'right' }: Omit<EntryDetailProps, 'layoutStyle'>) {
  const [fontSize, setFontSize] = useState(1);
  if (!entry) return null;

  const headerColor = getCardColor(cardIndex);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={`${getSizeClasses(drawerSide)} p-0 border-[3px] border-foreground/80 shadow-[-8px_0_0_hsl(var(--foreground)/0.15)] overflow-y-auto [&>button]:hidden`}
      >
        {/* Colored header block matching card */}
        <div className="px-6 pt-5 pb-4 sticky top-0 z-10" style={{ backgroundColor: headerColor }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getCategoryEmoji(entry.categories?.name)}</span>
                <h2 className="text-xl font-black text-foreground/90">
                  {entry.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {entry.categories && (
                  <Badge className="bg-foreground/80 text-background text-[11px] border-0 rounded-sm">
                    {entry.categories.name}
                  </Badge>
                )}
                <span className="text-xs text-foreground/50">
                  {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
                </span>
                {entry.contributors.length > 1 && (
                  <span className="text-xs text-foreground/50">
                    · {entry.contributors.length} 位贡献者
                  </span>
                )}
                {entry.is_private && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 border-foreground/30">
                    <EyeOff className="h-3 w-3" />私密
                  </Badge>
                )}
              </div>
            </div>
            <ActionButtons entry={entry} canManage={canManage} onEdit={onEdit} onDelete={onDelete} onClose={() => onOpenChange(false)} layoutStyle="neubrutalism" />
          </div>
          <div className="mt-3 flex justify-end">
            <FontSizeControl fontSize={fontSize} setFontSize={setFontSize} variant="neu" />
          </div>
        </div>

        {/* Content with white background */}
        <div className="px-6 py-5 bg-background">
          <MarkdownRenderer content={entry.content} proseSize={PROSE_SIZE_CLASSES[fontSize]} />
        </div>

        {/* Brutalist footer */}
        <div className="px-6 pb-5 bg-background">
          <div className="border-t-2 border-foreground/20 pt-3 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest">— END —</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════
   DEFAULT / FALLBACK (bento-glass uses CyberLayout's built-in detail)
   ═══════════════════════════════════════════════ */
function DefaultDetail({ entry, open, onOpenChange, canManage, onEdit, onDelete, drawerSide = 'right' }: Omit<EntryDetailProps, 'layoutStyle' | 'cardIndex'>) {
  if (!entry) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={drawerSide} className={`${getSizeClasses(drawerSide)} p-0 overflow-y-auto [&>button]:hidden`}>
        <div className="px-6 pt-6 pb-4 border-b border-border/40 sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-xl font-semibold">{entry.title}</h2>
              <div className="flex items-center gap-2">
                {entry.categories && <Badge variant="secondary">{entry.categories.name}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
                </span>
                {entry.is_private && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <EyeOff className="h-3 w-3" />私密
                  </Badge>
                )}
              </div>
            </div>
            <ActionButtons entry={entry} canManage={canManage} onEdit={onEdit} onDelete={onDelete} onClose={() => onOpenChange(false)} />
          </div>
        </div>
        <div className="px-6 py-5">
          <MarkdownRenderer content={entry.content} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Main export: routes to style-specific detail ── */
export function EntryDetail(props: EntryDetailProps) {
  const { layoutStyle, drawerSide, ...rest } = props;

  switch (layoutStyle) {
    case 'dark-editorial':
      return <EditorialDetail {...rest} drawerSide={drawerSide} />;
    case 'neubrutalism':
      return <NeuDetail {...rest} cardIndex={props.cardIndex} drawerSide={drawerSide} />;
    default:
      return <DefaultDetail {...rest} drawerSide={drawerSide} />;
  }
}
