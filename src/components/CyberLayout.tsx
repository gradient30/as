import { useState, useMemo, useRef, useCallback } from 'react';
import { HotNewsPanel } from '@/components/HotNewsPanel';
import logoFish from '@/assets/logo-fish.png';
import { format } from 'date-fns';
import { Search, Plus, Command, X, Copy, Pencil, Clock, BookOpen, ChevronDown, ChevronRight, Share2, EyeOff, Eye, Trash2, MessageCircle, ExternalLink, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Skeleton } from '@/components/ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useToggleEntryVisibility, useRecordView } from '@/hooks/useEntries';
import type { EntryWithCategory } from '@/hooks/useEntries';
import type { CategoryRow } from '@/hooks/useEntries';
import { toast } from 'sonner';

// ===== Helper functions =====
function getReadCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return Math.abs(hash % 500) + 10;
}

function getCategoryEmoji(name?: string): string {
  if (!name) return '📝';
  const map: Record<string, string> = { '技术开发': '⚙️', '产品设计': '🦞', '运营管理': '📊', '学习笔记': '📚', '新闻时事': '📰' };
  return map[name] || '📝';
}

function extractHeadings(content: string): { level: number; text: string }[] {
  return content.split('\n')
    .filter(l => /^#{1,3}\s/.test(l))
    .map(l => {
      const match = l.match(/^(#{1,3})\s+(.+)/);
      return match ? { level: match[1].length, text: match[2].replace(/[*`]/g, '') } : null;
    })
    .filter(Boolean) as { level: number; text: string }[];
}

function getShareUrl(entry: EntryWithCategory) {
  const base = 'https://obs.996fb.cn';
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

// ===== Compact Entry Item =====
function EntryListItem({ entry, isSelected, onClick }: {
  entry: EntryWithCategory;
  isSelected: boolean;
  onClick: () => void;
}) {
  const snippet = entry.content.replace(/[#*`~\[\]>!|-]/g, '').replace(/\n/g, ' ').trim();
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 cursor-pointer transition-all border-l-2 ${
        isSelected
          ? 'border-l-[hsl(var(--cyber-accent))] bg-[hsl(var(--cyber-accent)/0.05)]'
          : 'border-l-transparent hover:bg-[hsl(var(--cyber-surface-hover))]'
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
      <h4 className="text-sm font-bold text-[hsl(var(--cyber-text))] line-clamp-1 flex items-center gap-1.5">
          <span className="text-base">{getCategoryEmoji(entry.categories?.name)}</span>
          {entry.title}
          {entry.is_private && <EyeOff className="h-3 w-3 text-[hsl(var(--cyber-accent)/0.5)] flex-shrink-0" />}
        </h4>
        <span className="text-[10px] text-[hsl(var(--cyber-text-secondary))] font-mono ml-2 flex-shrink-0">
          {format(new Date(entry.created_at), 'HH:mm')}
        </span>
      </div>
      <p className="text-xs text-[hsl(var(--cyber-text-muted))] line-clamp-1 pl-6">
        {snippet.slice(0, 80)}
      </p>
    </div>
  );
}

// ===== Virtualized Entry List =====
function VirtualizedEntryList({ entries, selectedEntry, onSelect }: {
  entries: EntryWithCategory[];
  selectedEntry: EntryWithCategory | null;
  onSelect: (e: EntryWithCategory) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <EntryListItem
              entry={entries[virtualItem.index]}
              isSelected={selectedEntry?.id === entries[virtualItem.index].id}
              onClick={() => onSelect(entries[virtualItem.index])}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Collapsible Category Group =====
function CategoryGroup({ categoryName, entries, selectedEntry, onSelect, defaultOpen = false }: {
  categoryName: string;
  entries: EntryWithCategory[];
  selectedEntry: EntryWithCategory | null;
  onSelect: (e: EntryWithCategory) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono tracking-wider text-[hsl(var(--cyber-text-secondary))] hover:text-[hsl(var(--cyber-text))] hover:bg-[hsl(var(--cyber-surface-hover))] transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="text-sm">{getCategoryEmoji(categoryName)}</span>
        <span className="uppercase flex-1 text-left">{categoryName}</span>
        <span className="text-[hsl(var(--cyber-accent)/0.6)] font-bold">{entries.length}</span>
      </button>
      {open && entries.map(entry => (
        <EntryListItem
          key={entry.id}
          entry={entry}
          isSelected={selectedEntry?.id === entry.id}
          onClick={() => onSelect(entry)}
        />
      ))}
    </div>
  );
}

// ===== Detail View =====
function DetailView({ entry, canManage, onEdit, onClose, onDelete }: {
  entry: EntryWithCategory;
  canManage: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const wordCount = entry.content.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 400));
  const reads = getReadCount(entry.id);
  const [fontSize, setFontSize] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const toggleVisibility = useToggleEntryVisibility();

  const shareUrl = getShareUrl(entry);
  const shareText = getShareText(entry);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.content);
    toast.success('内容已复制');
  };

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

  const shareToWeChat = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      toast.success('链接已复制，正在前往微信...');
      window.open('weixin://', '_self');
    });
  };

  const shareToQQ = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      toast.success('链接已复制，正在前往QQ...');
      window.open('mqq://', '_self');
    });
  };

  const shareToXiaohongshu = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      toast.success('内容已复制，正在打开小红书...');
      window.open('https://www.xiaohongshu.com', '_blank');
    });
  };

  const handleToggleVisibility = () => {
    toggleVisibility.mutate({ id: entry.id, is_private: !entry.is_private });
  };

   // Font size: use Tailwind prose size classes for reliable scaling
  const proseSizeClasses = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl'];

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[hsl(var(--cyber-border))]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 bg-[hsl(var(--cyber-tag-bg))] text-[hsl(var(--cyber-tag-text))] font-bold">
            {entry.categories?.name || '未分类'}
          </span>
          {entry.is_private && (
            <Badge variant="outline" className="text-[10px] font-mono gap-1 border-[hsl(var(--cyber-accent)/0.3)] text-[hsl(var(--cyber-accent-text))]">
              <EyeOff className="h-3 w-3" />
              私密
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Share */}
          <Popover open={shareOpen} onOpenChange={setShareOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]" title="分享">
                <Share2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <p className="text-sm font-medium">分享到</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={shareToWeChat}>
                    <MessageCircle className="h-3.5 w-3.5" />微信
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={shareToQQ}>
                    QQ
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={shareToXiaohongshu}>
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
                  <Button size="sm" variant="secondary" className="flex-1 gap-1.5 text-xs" onClick={() => window.open(shareUrl, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" />新窗口打开
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]" onClick={handleCopy} title="复制内容">
            <Copy className="h-4 w-4" />
          </Button>

          {canManage && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]"
                onClick={handleToggleVisibility} disabled={toggleVisibility.isPending}
                title={entry.is_private ? '设为公开' : '设为私密'}>
                {entry.is_private ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]" onClick={onEdit} title="编辑">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="删除">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]" onClick={onClose} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="text-3xl font-black text-[hsl(var(--cyber-text))] mb-4 flex items-center gap-3">
          <span className="text-2xl">{getCategoryEmoji(entry.categories?.name)}</span>
          {entry.title}
        </h1>

        <div className="flex items-center gap-4 mb-4 text-[11px] text-[hsl(var(--cyber-text-muted))] font-mono">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 创建时间 {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}</span>
          <span>字数 <strong className="text-[hsl(var(--cyber-text-secondary))]">{wordCount} 字</strong></span>
          <span>阅读时长 <strong className="text-[hsl(var(--cyber-text-secondary))]">{readTime} min</strong></span>
          <span>阅读量 <strong className="text-[hsl(var(--cyber-text-secondary))]">{reads} 次</strong></span>
        </div>

        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[hsl(var(--cyber-border-subtle))]">
          <span className="text-[10px] text-[hsl(var(--cyber-text-dim))] font-mono">字号</span>
          {['A', 'A', 'A', 'A'].map((label, i) => (
            <button
              key={i}
              onClick={() => setFontSize(i)}
              className={`w-7 h-7 flex items-center justify-center font-bold rounded transition-all ${
                fontSize === i
                  ? 'bg-[hsl(var(--cyber-tag-bg))] text-[hsl(var(--cyber-tag-text))]'
                  : 'text-[hsl(var(--cyber-text-muted))] hover:text-[hsl(var(--cyber-text-secondary))]'
              }`}
              style={{ fontSize: `${10 + i * 2}px` }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className={`max-w-none
            prose-headings:text-[hsl(var(--cyber-heading))] prose-headings:font-black prose-headings:border-l-2 prose-headings:border-[hsl(var(--cyber-heading))] prose-headings:pl-3
            prose-p:text-[hsl(var(--cyber-text))] prose-p:leading-relaxed
            prose-strong:text-[hsl(var(--cyber-text))] prose-strong:font-black
            prose-a:text-[hsl(var(--cyber-accent-text))] prose-a:font-semibold
            prose-code:text-[hsl(var(--cyber-accent-text))]
            prose-li:text-[hsl(var(--cyber-text))]
            prose-blockquote:text-[hsl(var(--cyber-text-secondary))]
            prose-hr:border-[hsl(var(--cyber-border))]`}
          style={{ lineHeight: 1.8 }}
        >
          <MarkdownRenderer content={entry.content} proseSize={proseSizeClasses[fontSize]} />
        </div>

        <div className="mt-12 pt-6 border-t border-[hsl(var(--cyber-border-subtle))] text-center">
          <span className="text-[10px] font-mono tracking-[0.3em] text-[hsl(var(--cyber-text-dim))]">END OF DOCUMENT</span>
        </div>
      </div>
    </div>
  );
}

// ===== Right Sidebar =====
function DocInfoSidebar({ entry }: { entry: EntryWithCategory }) {
  const headings = extractHeadings(entry.content);
  const wordCount = entry.content.length;
  const reads = getReadCount(entry.id);

  return (
    <div className="p-4 space-y-6 text-xs font-mono">
      <div>
        <h3 className="text-xs tracking-[0.2em] text-[hsl(var(--cyber-text-secondary))] uppercase mb-3 font-bold">DOC INFO</h3>
        <div className="space-y-2.5">
          {[
            { label: '分类', value: entry.categories?.name || '未分类' },
            { label: '创建', value: format(new Date(entry.created_at), 'yyyy-MM-dd') },
            { label: '字数', value: String(wordCount) },
            { label: '阅读量', value: String(reads) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[hsl(var(--cyber-text-secondary))]">{item.label}</span>
              <span className="text-[hsl(var(--cyber-text))] font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {headings.length > 0 && (
        <div>
        <h3 className="text-xs tracking-[0.2em] text-[hsl(var(--cyber-text-secondary))] uppercase mb-3 font-bold">目 录</h3>
          <div className="space-y-2">
            {headings.map((h, i) => (
              <div key={i} className="flex items-start gap-1.5" style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                <span className="text-[hsl(var(--cyber-accent)/0.4)] mt-1">○</span>
                <span className="text-[hsl(var(--cyber-text))] hover:text-[hsl(var(--cyber-accent-text))] cursor-pointer transition-colors">{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs tracking-[0.2em] text-[hsl(var(--cyber-text-secondary))] uppercase mb-3 font-bold">标 签</h3>
        <div className="flex flex-wrap gap-1.5">
          {[entry.categories?.name, ...(entry.content.match(/[\u4e00-\u9fff]{2,4}/g)?.slice(0, 4) || [])].filter(Boolean).map((tag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 border border-[hsl(var(--cyber-border))] text-[hsl(var(--cyber-text))] hover:border-[hsl(var(--cyber-accent)/0.4)] cursor-pointer transition-colors">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Main Layout =====
interface CyberLayoutProps {
  entries: EntryWithCategory[] | undefined;
  entriesLoading: boolean;
  categories: CategoryRow[] | undefined;
  categoryFilter: string | undefined;
  setCategoryFilter: (id: string | undefined) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  viewMode: 'discover' | 'mine' | 'hotspot';
  setViewMode: (v: 'discover' | 'mine' | 'hotspot') => void;
  selectedEntry: EntryWithCategory | null;
  setSelectedEntry: (e: EntryWithCategory | null) => void;
  canManageEntry: (e: EntryWithCategory) => boolean;
  isOwnEntry: (e: EntryWithCategory) => boolean;
  onEdit: (e: EntryWithCategory) => void;
  onDelete: (entryId: string) => void;
  onSubmit: () => void;
  totalCount: number;
  currentTime: string;
  user: any;
  headerActions: React.ReactNode;
}

export function CyberLayout({
  entries, entriesLoading, categories, categoryFilter, setCategoryFilter,
  searchQuery, setSearchQuery, viewMode, setViewMode,
  selectedEntry, setSelectedEntry,
  canManageEntry, isOwnEntry, onEdit, onDelete, onSubmit,
  totalCount, currentTime, user, headerActions,
}: CyberLayoutProps) {
  const l1Cats = categories?.filter(c => !c.parent_id && c.is_system) || [];
  const recordView = useRecordView();

  const handleSelectEntry = useCallback((entry: EntryWithCategory) => {
    setSelectedEntry(entry);
    recordView.mutate(entry.id);
  }, [setSelectedEntry, recordView]);

  // Flatten entries for virtual scrolling when no category grouping
  const flatEntries = useMemo(() => entries || [], [entries]);

  // Group entries by category
  const groupedEntries = useMemo(() => {
    if (!entries) return [];
    const groups = new Map<string, { name: string; entries: EntryWithCategory[] }>();
    for (const entry of entries) {
      const catName = entry.categories?.name || '未分类';
      if (!groups.has(catName)) groups.set(catName, { name: catName, entries: [] });
      groups.get(catName)!.entries.push(entry);
    }
    return Array.from(groups.values());
  }, [entries]);

  const filteredGroups = useMemo(() => {
    if (!categoryFilter) return groupedEntries;
    const selectedCat = categories?.find(c => c.id === categoryFilter);
    if (!selectedCat) return groupedEntries;
    return groupedEntries.filter(g => g.name === selectedCat.name);
  }, [groupedEntries, categoryFilter, categories]);

  // Use virtual scrolling when total entries > 100
  const useVirtual = flatEntries.length > 100;

  return (
    <div className="h-[calc(100vh-41px)] flex flex-col cyber-theme container mx-auto px-4">
      {/* Top nav bar */}
      <nav className="py-2.5 flex items-center justify-between border-b border-[hsl(var(--cyber-border))] flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoFish} alt="openwz" className="h-7 w-7 object-contain" />
          <div>
            <h2 className="text-[11px] font-black tracking-[0.2em] text-[hsl(var(--cyber-text))] uppercase font-mono">OPENWZ</h2>
            <p className="text-[8px] tracking-[0.15em] text-[hsl(var(--cyber-accent)/0.6)] font-mono">个人知识库</p>
          </div>
        </div>

        {/* Center: category quick filters */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setCategoryFilter(undefined)}
            className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all ${
              !categoryFilter ? 'text-[hsl(var(--cyber-accent))] font-bold' : 'text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]'
            }`}
          >
            全部
          </button>
          {l1Cats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? undefined : cat.id)}
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all ${
                categoryFilter === cat.id ? 'text-[hsl(var(--cyber-accent))] font-bold' : 'text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono tracking-wider">
          <button
            onClick={() => setViewMode('discover')}
            className={`transition-colors ${viewMode === 'discover' ? 'text-[hsl(var(--cyber-text))]' : 'text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-text))]'}`}
          >
            发现
          </button>
          <button
            onClick={() => setViewMode('mine')}
            className={`transition-colors font-bold ${viewMode === 'mine' ? 'text-[hsl(var(--cyber-accent))]' : 'text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(var(--cyber-accent))]'}`}
          >
            我的
          </button>
          <button
            onClick={() => setViewMode('hotspot')}
            className={`transition-colors font-bold ${viewMode === 'hotspot' ? 'text-[hsl(25,80%,55%)]' : 'text-[hsl(var(--cyber-text-dim))] hover:text-[hsl(25,80%,55%)]'}`}
          >
            🔥热点
          </button>
          <span className="text-[hsl(var(--cyber-accent))] text-sm font-black tracking-widest">{currentTime}</span>
          {headerActions}
        </div>
      </nav>

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[260px] flex-shrink-0 border-r border-[hsl(var(--cyber-border-subtle))] flex flex-col bg-[hsl(var(--cyber-sidebar))]">
          {/* Search */}
          <div className="p-2.5 border-b border-[hsl(var(--cyber-border-subtle))]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--cyber-text-dim))]" />
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-[hsl(var(--cyber-border))] bg-[hsl(var(--cyber-input-bg))] text-[hsl(var(--cyber-text))] placeholder:text-[hsl(var(--cyber-text-dim))] font-mono"
              />
            </div>
          </div>

          {/* View mode tabs */}
          <div className="px-2.5 py-1.5 flex gap-1 border-b border-[hsl(var(--cyber-border-subtle))]">
            <button
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all border ${
                viewMode === 'discover' && !categoryFilter
                  ? 'border-[hsl(var(--cyber-accent)/0.5)] bg-[hsl(var(--cyber-accent)/0.1)] text-[hsl(var(--cyber-accent))] font-bold'
                  : 'border-[hsl(var(--cyber-border))] text-[hsl(var(--cyber-text-muted))] hover:border-[hsl(var(--cyber-accent)/0.3)]'
              }`}
              onClick={() => { setCategoryFilter(undefined); setViewMode('discover'); }}
            >
              全部
            </button>
            <button
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all border ${
                viewMode === 'mine'
                  ? 'border-[hsl(var(--cyber-accent)/0.5)] bg-[hsl(var(--cyber-accent)/0.1)] text-[hsl(var(--cyber-accent))] font-bold'
                  : 'border-[hsl(var(--cyber-border))] text-[hsl(var(--cyber-text-muted))] hover:border-[hsl(var(--cyber-accent)/0.3)]'
              }`}
              onClick={() => setViewMode(viewMode === 'mine' ? 'discover' : 'mine')}
            >
              我的
            </button>
            <button
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all border ${
                viewMode === 'hotspot'
                  ? 'border-[hsl(25,80%,55%)/0.5] bg-[hsl(25,80%,55%)/0.1] text-[hsl(25,80%,55%)] font-bold'
                  : 'border-[hsl(var(--cyber-border))] text-[hsl(var(--cyber-text-muted))] hover:border-[hsl(25,80%,55%)/0.3]'
              }`}
              onClick={() => setViewMode(viewMode === 'hotspot' ? 'discover' : 'hotspot')}
            >
              🔥热点
            </button>
          </div>

          {/* Document count */}
          <div className="px-3 py-1.5 text-[9px] font-mono tracking-[0.15em] text-[hsl(var(--cyber-text-dim))] uppercase border-b border-[hsl(var(--cyber-border-subtle))]">
            {entries?.length || 0} DOCUMENTS
          </div>

          {/* Entry list - virtual or grouped */}
          {entriesLoading ? (
            <div className="p-3 space-y-3 flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <Skeleton className="h-4 w-16 bg-[hsl(var(--cyber-border))]" />
                  <Skeleton className="h-4 w-3/4 bg-[hsl(var(--cyber-border-subtle))]" />
                  <Skeleton className="h-3 w-full bg-[hsl(var(--cyber-border-subtle))]" />
                </div>
              ))}
            </div>
          ) : useVirtual ? (
            <VirtualizedEntryList
              entries={flatEntries}
              selectedEntry={selectedEntry}
              onSelect={handleSelectEntry}
            />
          ) : filteredGroups.length > 0 ? (
            <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--cyber-border-subtle))]">
              {filteredGroups.map(group => (
                <CategoryGroup
                  key={group.name}
                  categoryName={group.name}
                  entries={group.entries}
                  selectedEntry={selectedEntry}
                  onSelect={handleSelectEntry}
                  defaultOpen={filteredGroups.length <= 3 || group.entries.some(e => e.id === selectedEntry?.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-[hsl(var(--cyber-text-dim))] text-xs font-mono">
              暂无文档
            </div>
          )}
        </aside>

        {/* CENTER */}
        <main className="flex-1 overflow-hidden bg-[hsl(var(--cyber-content-bg))]">
          {viewMode === 'hotspot' ? (
            <HotNewsPanel variant="cyber" />
          ) : selectedEntry ? (
            <DetailView
              entry={selectedEntry}
              canManage={canManageEntry(selectedEntry)}
              onEdit={() => onEdit(selectedEntry)}
              onClose={() => setSelectedEntry(null)}
              onDelete={() => onDelete(selectedEntry.id)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <BookOpen className="h-16 w-16 text-[hsl(var(--cyber-accent)/0.15)] mb-4" />
              <p className="text-[hsl(var(--cyber-text-dim))] font-mono text-sm mb-1">选择一篇文档开始阅读</p>
              <p className="text-[hsl(var(--cyber-text-dim)/0.6)] font-mono text-xs mb-6">或创建新的知识条目</p>
              <Button
                onClick={onSubmit}
                className="bg-[hsl(var(--cyber-accent))] text-[hsl(var(--cyber-accent-contrast))] hover:opacity-90 font-mono font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5" />新建
              </Button>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {selectedEntry && (
          <aside className="w-[200px] flex-shrink-0 border-l border-[hsl(var(--cyber-border-subtle))] overflow-y-auto bg-[hsl(var(--cyber-sidebar))]">
            <DocInfoSidebar entry={selectedEntry} />
          </aside>
        )}
      </div>

      {/* Status bar */}
      <footer className="border-t border-[hsl(var(--cyber-border))] bg-[hsl(var(--cyber-sidebar))] flex-shrink-0">
        <div className="px-4 py-1.5 flex items-center justify-between text-[9px] font-mono tracking-[0.15em]">
          <div className="flex items-center gap-5">
            <span className="text-[hsl(var(--cyber-text-dim))]">STATUS: <span className="text-[hsl(120,80%,55%)] italic">OPERATIONAL</span></span>
            <span className="text-[hsl(var(--cyber-text-dim))]">NOTES: <span className="text-[hsl(var(--cyber-text-secondary))] font-black">{String(totalCount).padStart(3, '0')} LOADED</span></span>
            <span className="hidden sm:inline text-[hsl(var(--cyber-text-dim))]">LAST SYNC: <span className="text-[hsl(var(--cyber-accent-text))]">{currentTime}</span></span>
          </div>
          <span className="text-[hsl(var(--cyber-text-dim))]">STORAGE: <span className="text-[hsl(var(--cyber-accent))]">{Math.min(99, 8 + totalCount * 2)}% USED</span></span>
        </div>
      </footer>
    </div>
  );
}
