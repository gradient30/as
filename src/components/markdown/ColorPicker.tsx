import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';

interface ColorPickerProps {
  icon: React.ElementType;
  label: string;
  colors: { name: string; value: string; css: string }[];
  onSelect: (color: string) => void;
}

export const TEXT_COLORS = [
  { name: '红色', value: 'red', css: '#ef4444' },
  { name: '橙色', value: 'orange', css: '#f97316' },
  { name: '黄色', value: 'yellow', css: '#eab308' },
  { name: '绿色', value: 'green', css: '#22c55e' },
  { name: '蓝色', value: 'blue', css: '#3b82f6' },
  { name: '紫色', value: 'purple', css: '#a855f7' },
  { name: '粉色', value: 'pink', css: '#ec4899' },
  { name: '灰色', value: 'gray', css: '#6b7280' },
];

export const BG_COLORS = [
  { name: '红色背景', value: 'red', css: '#fecaca' },
  { name: '橙色背景', value: 'orange', css: '#fed7aa' },
  { name: '黄色背景', value: 'yellow', css: '#fef08a' },
  { name: '绿色背景', value: 'green', css: '#bbf7d0' },
  { name: '蓝色背景', value: 'blue', css: '#bfdbfe' },
  { name: '紫色背景', value: 'purple', css: '#e9d5ff' },
  { name: '粉色背景', value: 'pink', css: '#fbcfe8' },
  { name: '灰色背景', value: 'gray', css: '#e5e7eb' },
];

export function ColorPicker({ icon: Icon, label, colors, onSelect }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <Icon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <p className="text-xs text-muted-foreground mb-1.5 px-1">{label}</p>
        <div className="grid grid-cols-4 gap-1">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c.css }}
              title={c.name}
              onClick={() => {
                onSelect(c.css);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
