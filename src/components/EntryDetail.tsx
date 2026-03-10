import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Pencil, Trash2, Share2, EyeOff, Eye, Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { useState } from 'react';
import type { EntryWithCategory } from '@/hooks/useEntries';
import { useToggleEntryVisibility } from '@/hooks/useEntries';

interface EntryDetailProps {
  entry: EntryWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getShareUrl(entry: EntryWithCategory) {
  let url = `${window.location.origin}/?entry=${entry.id}`;
  if (entry.is_private && entry.share_token) {
    url += `&share=${entry.share_token}`;
  }
  return url;
}

function getShareText(entry: EntryWithCategory) {
  const snippet = entry.content.replace(/[#*`~\[\]>!|-]/g, '').replace(/\n/g, ' ').trim().slice(0, 100);
  return `【${entry.title}】${snippet}...`;
}

export function EntryDetail({ entry, open, onOpenChange, canManage, onEdit, onDelete }: EntryDetailProps) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const toggleVisibility = useToggleEntryVisibility();

  if (!entry) return null;

  const shareUrl = getShareUrl(entry);
  const shareText = getShareText(entry);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('内容和链接已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  const shareToWeChat = () => {
    // WeChat doesn't have a direct web share URL, copy content for pasting
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      toast.success('内容已复制，请打开微信粘贴分享');
    });
  };

  const shareToQQ = () => {
    const qqUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(entry.title)}&summary=${encodeURIComponent(shareText)}`;
    window.open(qqUrl, '_blank', 'width=600,height=500');
  };

  const shareToXiaohongshu = () => {
    // 小红书没有直接分享API，复制内容后打开
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      toast.success('内容已复制，正在打开小红书...');
      window.open('https://www.xiaohongshu.com', '_blank');
    });
  };

  const handleToggleVisibility = () => {
    toggleVisibility.mutate({ id: entry.id, is_private: !entry.is_private });
  };

  const isPrivate = entry.is_private;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-xl">{entry.title}</DialogTitle>
              {isPrivate && (
                <Badge variant="outline" className="text-xs gap-1">
                  <EyeOff className="h-3 w-3" />
                  私密
                </Badge>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Popover open={shareOpen} onOpenChange={setShareOpen}>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">分享到</p>
                    
                    {/* Share buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={shareToWeChat}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        微信
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={shareToQQ}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                        QQ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={shareToXiaohongshu}
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                        小红书
                      </Button>
                    </div>

                    {/* Link copy */}
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">分享链接</p>
                      <div className="flex gap-1.5">
                        <Input
                          value={shareUrl}
                          readOnly
                          className="h-8 text-xs"
                          onFocus={(e) => e.target.select()}
                        />
                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCopyLink}>
                          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Copy all + open in new tab */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1 gap-1.5 text-xs" onClick={handleCopyAll}>
                        <Copy className="h-3.5 w-3.5" />
                        复制内容+链接
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => window.open(shareUrl, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        新窗口打开
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {canManage && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleToggleVisibility}
                    disabled={toggleVisibility.isPending}
                    title={isPrivate ? '设为公开' : '设为私密'}
                  >
                    {isPrivate ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => { onDelete?.(); onOpenChange(false); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 pt-1">
              {entry.categories && (
                <Badge variant="secondary">{entry.categories.name}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
              </span>
              {entry.contributors.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  · {entry.contributors.length} 位贡献者
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <MarkdownRenderer content={entry.content} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
