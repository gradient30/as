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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSubmitEntry } from '@/hooks/useEntries';
import { Loader2 } from 'lucide-react';

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitDialog({ open, onOpenChange }: SubmitDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const submitEntry = useSubmitEntry();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await submitEntry.mutateAsync({ title: title.trim(), content: content.trim() });
    setTitle('');
    setContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>录入知识</DialogTitle>
          <DialogDescription>
            输入标题和内容，系统将自动分类。相似知识将被智能合并。
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
            <Label htmlFor="content">内容</Label>
            <Textarea
              id="content"
              placeholder="详细描述..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
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
