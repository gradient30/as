import { useState, useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered, Link, Image,
  Quote, Heading1, Heading2, Heading3, Table, Minus, CheckSquare, FileCode,
  Palette, Highlighter, Upload, Loader2,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { ColorPicker, TEXT_COLORS, BG_COLORS } from '@/components/markdown/ColorPicker';
import { SymbolPicker } from '@/components/markdown/SymbolPicker';
import { uploadMarkdownImage, isImageFile } from '@/lib/upload-image';
import { toast } from 'sonner';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

type MarkdownAction = {
  icon: React.ElementType;
  label: string;
  action: (text: string, selStart: number, selEnd: number) => { text: string; cursor: number };
};

function wrapSelection(text: string, start: number, end: number, before: string, after: string) {
  const sel = text.slice(start, end) || '文本';
  const result = text.slice(0, start) + before + sel + after + text.slice(end);
  return { text: result, cursor: start + before.length + sel.length };
}

function wrapLine(text: string, cursor: number, prefix: string) {
  const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
  const result = text.slice(0, lineStart) + prefix + text.slice(lineStart);
  return { text: result, cursor: cursor + prefix.length };
}

const markdownActions: MarkdownAction[] = [
  { icon: Heading1, label: '一级标题', action: (t, s) => wrapLine(t, s, '# ') },
  { icon: Heading2, label: '二级标题', action: (t, s) => wrapLine(t, s, '## ') },
  { icon: Heading3, label: '三级标题', action: (t, s) => wrapLine(t, s, '### ') },
  { icon: Bold, label: '粗体', action: (t, s, e) => wrapSelection(t, s, e, '**', '**') },
  { icon: Italic, label: '斜体', action: (t, s, e) => wrapSelection(t, s, e, '*', '*') },
  { icon: Strikethrough, label: '删除线', action: (t, s, e) => wrapSelection(t, s, e, '~~', '~~') },
  { icon: Code, label: '行内代码', action: (t, s, e) => wrapSelection(t, s, e, '`', '`') },
  {
    icon: FileCode, label: '代码块',
    action: (t, s, e) => {
      const sel = t.slice(s, e) || '// 代码';
      const block = '```js\n' + sel + '\n```';
      return { text: t.slice(0, s) + block + t.slice(e), cursor: s + 6 + sel.length };
    },
  },
  { icon: Quote, label: '引用', action: (t, s) => wrapLine(t, s, '> ') },
  { icon: List, label: '无序列表', action: (t, s) => wrapLine(t, s, '- ') },
  { icon: ListOrdered, label: '有序列表', action: (t, s) => wrapLine(t, s, '1. ') },
  { icon: CheckSquare, label: '任务列表', action: (t, s) => wrapLine(t, s, '- [ ] ') },
  {
    icon: Link, label: '链接',
    action: (t, s, e) => {
      const sel = t.slice(s, e) || '链接文字';
      return { text: t.slice(0, s) + `[${sel}](url)` + t.slice(e), cursor: s + sel.length + 3 };
    },
  },
  {
    icon: Image, label: '图片',
    action: (t, s, e) => ({ text: t.slice(0, s) + `![alt](url)` + t.slice(e), cursor: s + 6 }),
  },
  {
    icon: Table, label: '表格',
    action: (t, s, e) => {
      const table = '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |';
      return { text: t.slice(0, s) + table + t.slice(e), cursor: s + table.length };
    },
  },
  {
    icon: Minus, label: '分割线',
    action: (t, s, e) => ({ text: t.slice(0, s) + '\n---\n' + t.slice(e), cursor: s + 5 }),
  },
];

export function MarkdownEditor({ value, onChange, placeholder, rows = 8 }: MarkdownEditorProps) {
  const [tab, setTab] = useState<string>('write');
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAction = useCallback(
    (action: MarkdownAction['action']) => {
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const { text, cursor } = action(value, start, end);
      onChange(text);
      requestAnimationFrame(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(cursor, cursor);
      });
    },
    [textareaRef, value, onChange]
  );

  const insertAtCursor = useCallback(
    (insertion: string) => {
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const result = value.slice(0, start) + insertion + value.slice(end);
      onChange(result);
      const newCursor = start + insertion.length;
      requestAnimationFrame(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(newCursor, newCursor);
      });
    },
    [textareaRef, value, onChange]
  );

  /* ── Image upload logic ── */
  const handleImageUpload = useCallback(
    async (files: File[]) => {
      const images = files.filter(isImageFile);
      if (images.length === 0) {
        toast.error('请选择图片文件');
        return;
      }
      setUploading(true);
      try {
        for (const file of images) {
          const url = await uploadMarkdownImage(file);
          const mdImage = `![${file.name}](${url})\n`;
          // Insert at current cursor or end
          if (textareaRef) {
            const pos = textareaRef.selectionStart;
            const result = value.slice(0, pos) + mdImage + value.slice(pos);
            onChange(result);
            // Update value ref for next iteration
            requestAnimationFrame(() => {
              textareaRef.focus();
              const newPos = pos + mdImage.length;
              textareaRef.setSelectionRange(newPos, newPos);
            });
          } else {
            onChange(value + mdImage);
          }
        }
        toast.success(`已上传 ${images.length} 张图片`);
      } catch (err: any) {
        toast.error(err.message || '图片上传失败');
      } finally {
        setUploading(false);
      }
    },
    [textareaRef, value, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleImageUpload(imageFiles);
      }
    },
    [handleImageUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.some(isImageFile)) {
        handleImageUpload(files);
      }
    },
    [handleImageUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleTextColor = useCallback(
    (color: string) => {
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const sel = value.slice(start, end) || '文本';
      const html = `<span style="color:${color}">${sel}</span>`;
      const result = value.slice(0, start) + html + value.slice(end);
      onChange(result);
      const cursor = start + html.length;
      requestAnimationFrame(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(cursor, cursor);
      });
    },
    [textareaRef, value, onChange]
  );

  const handleBgColor = useCallback(
    (color: string) => {
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const sel = value.slice(start, end) || '文本';
      const html = `<span style="background:${color};padding:0 4px;border-radius:3px">${sel}</span>`;
      const result = value.slice(0, start) + html + value.slice(end);
      onChange(result);
      const cursor = start + html.length;
      requestAnimationFrame(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(cursor, cursor);
      });
    },
    [textareaRef, value, onChange]
  );

  return (
    <div className="border rounded-md border-input overflow-hidden">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2">
          <TabsList className="h-9 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="write"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs"
            >
              编辑
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs"
            >
              预览
            </TabsTrigger>
          </TabsList>
        </div>

        {tab === 'write' && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/20">
            <TooltipProvider delayDuration={300}>
              {markdownActions.map((ma, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => handleAction(ma.action)}
                    >
                      <ma.icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{ma.label}</TooltipContent>
                </Tooltip>
              ))}

              {/* Separator */}
              <div className="w-px h-5 bg-border mx-1" />

              {/* Text color picker */}
              <ColorPicker
                icon={Palette}
                label="文字颜色"
                colors={TEXT_COLORS}
                onSelect={handleTextColor}
              />

              {/* Background color picker */}
              <ColorPicker
                icon={Highlighter}
                label="背景高亮"
                colors={BG_COLORS}
                onSelect={handleBgColor}
              />

              {/* Symbol picker */}
              <SymbolPicker onSelect={insertAtCursor} />

              {/* Separator */}
              <div className="w-px h-5 bg-border mx-1" />

              {/* Upload image button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button" variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">上传图片</TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleImageUpload(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />
            </TooltipProvider>
          </div>
        )}

        <TabsContent value="write" className="mt-0">
          <div
            className={`relative ${dragOver ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {dragOver && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 pointer-events-none rounded">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Upload className="h-5 w-5" />
                  松开以上传图片
                </div>
              </div>
            )}
            {uploading && (
              <div className="absolute top-1 right-2 z-10 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/90 px-2 py-1 rounded">
                <Loader2 className="h-3 w-3 animate-spin" />
                上传中...
              </div>
            )}
            <Textarea
              ref={setTextareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder || '支持 Markdown 格式，可拖拽或粘贴图片自动上传...'}
              rows={rows}
              className="border-0 rounded-none focus-visible:ring-0 resize-y font-mono text-sm"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="p-4 min-h-[calc(1.5rem*8+1.5rem)] max-h-96 overflow-y-auto">
            {value.trim() ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">暂无内容可预览</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
