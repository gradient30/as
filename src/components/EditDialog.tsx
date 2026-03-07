import { useState, useEffect } from 'react';
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
import { useUpdateEntry } from '@/hooks/useEntries';
import { Loader2 } from 'lucide-react';
import type { EntryWithCategory } from '@/hooks/useEntries';

interface EditDialogProps {
  entry: EntryWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDialog({ entry, open, onOpenChange }: EditDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const updateEntry = useUpdateEntry();

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !title.trim() || !content.trim()) return;

    await updateEntry.mutateAsync({ id: entry.id, title: title.trim(), content: content.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑知识</DialogTitle>
          <DialogDescription>修改标题或内容后保存。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">标题</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-content">内容</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={updateEntry.isPending || !title.trim() || !content.trim()}>
              {updateEntry.isPending && <Loader2 className="animate-spin" />}
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
