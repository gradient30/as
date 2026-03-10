import { useState } from 'react';
import { useCategories } from '@/hooks/useEntries';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['entries'] });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const keywords = newKeywords.split(/[,，、\s]+/).filter(Boolean);
      const slug = newName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const { error } = await supabase.from('categories').insert({
        name: newName.trim(),
        slug,
        keywords,
        created_by_token: 'admin',
      });
      if (error) throw error;
      toast.success('分类已创建');
      setNewName('');
      setNewKeywords('');
      invalidate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    setLoading(true);
    try {
      const keywords = editKeywords.split(/[,，、\s]+/).filter(Boolean);
      const { error } = await supabase
        .from('categories')
        .update({ name: editName.trim(), keywords })
        .eq('id', editId);
      if (error) throw error;
      toast.success('分类已更新');
      setEditId(null);
      invalidate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      // Unlink entries first
      await supabase.from('entries').update({ category_id: null }).eq('category_id', deleteId);
      // Delete admins
      await supabase.from('category_admins').delete().eq('category_id', deleteId);
      // Delete category
      const { error } = await supabase.from('categories').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('分类已删除');
      setDeleteId(null);
      invalidate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: { id: string; name: string; keywords: string[] }) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditKeywords(cat.keywords.join(', '));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              分类管理
            </DialogTitle>
          </DialogHeader>

          {/* Create new */}
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <Label className="text-sm font-medium">新建分类</Label>
            <Input
              placeholder="分类名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder="关键词（逗号分隔）"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
            />
            <Button size="sm" onClick={handleCreate} disabled={loading || !newName.trim()}>
              <Plus className="h-4 w-4" />
              创建
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {categories?.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between border rounded-lg p-3 gap-2"
              >
                {editId === cat.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="分类名称"
                    />
                    <Input
                      value={editKeywords}
                      onChange={(e) => setEditKeywords(e.target.value)}
                      placeholder="关键词"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={loading}>
                        保存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cat.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cat.keywords.join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(!categories || categories.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">暂无分类</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该分类下的条目将变为未分类状态，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
