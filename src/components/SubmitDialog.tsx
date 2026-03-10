import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSubmitEntry } from '@/hooks/useEntries';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, EyeOff, AlertTriangle } from 'lucide-react';
import { MarkdownEditor } from '@/components/MarkdownEditor';

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitDialog({ open, onOpenChange }: SubmitDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const submitEntry = useSubmitEntry();
  const { user } = useAuth();

  const doSubmit = async (privateOverride?: boolean) => {
    if (!title.trim() || !content.trim()) return;
    const priv = privateOverride ?? isPrivate;

    await submitEntry.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      is_private: priv,
    });
    setTitle('');
    setContent('');
    setIsPrivate(false);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>录入知识</DialogTitle>
          <DialogDescription>
            支持 Markdown 语法，可实时预览。系统将自动分类，相似知识将被智能合并。
          </DialogDescription>
        </DialogHeader>

        {/* Anonymous warning */}
        {!user && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-destructive">未登录提醒</p>
              <p className="text-muted-foreground">
                当前以匿名身份录入，知识所有权仅与当前浏览器绑定。
                <strong className="text-foreground">更换设备、清除缓存或使用隐身模式都将永久失去管理权限</strong>。
                建议先登录账号后再录入，以确保知识与账号绑定。
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="知识点标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>内容</Label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="支持 Markdown 语法，如 **粗体**、*斜体*、`代码`、列表等..."
              rows={10}
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">仅自己可见</p>
                <p className="text-xs text-muted-foreground">开启后该知识仅自己可查看</p>
              </div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitEntry.isPending || !title.trim() || !content.trim()}
              onClick={() => doSubmit(true)}
            >
              {submitEntry.isPending && <Loader2 className="animate-spin" />}
              <EyeOff className="h-4 w-4" />
              私密提交
            </Button>
            <Button type="submit" disabled={submitEntry.isPending || !title.trim() || !content.trim()}>
              {submitEntry.isPending && !isPrivate && <Loader2 className="animate-spin" />}
              提交
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
