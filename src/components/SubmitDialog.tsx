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
import { Loader2, EyeOff } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await submitEntry.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      is_private: isPrivate,
    });
    setTitle('');
    setContent('');
    setIsPrivate(false);
    onOpenChange(false);
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
            <Button type="submit" disabled={submitEntry.isPending || !title.trim() || !content.trim()}>
              {submitEntry.isPending && <Loader2 className="animate-spin" />}
              提交
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
