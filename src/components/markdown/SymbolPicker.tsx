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
import { Smile } from 'lucide-react';
import { useState } from 'react';

const SYMBOL_GROUPS = [
  {
    label: '常用符号',
    symbols: ['©', '®', '™', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '√', '∑', '∫', 'π'],
  },
  {
    label: '箭头',
    symbols: ['←', '→', '↑', '↓', '↔', '⇐', '⇒', '⇑', '⇓', '⇔', '➜', '➤', '▶', '◀', '▲', '▼'],
  },
  {
    label: '标记',
    symbols: ['✓', '✗', '★', '☆', '♥', '♦', '♠', '♣', '●', '○', '■', '□', '▪', '▫', '◆', '◇'],
  },
  {
    label: '表情',
    symbols: ['😀', '😂', '🤔', '👍', '👎', '🎉', '🔥', '⚡', '💡', '📌', '📎', '🔗', '⚠️', '❗', '❓', '✅'],
  },
];

interface SymbolPickerProps {
  onSelect: (symbol: string) => void;
}

export function SymbolPicker({ onSelect }: SymbolPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">插入符号</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-2" align="start">
        {SYMBOL_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="text-xs text-muted-foreground mb-1 px-1">{group.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.symbols.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-sm transition-colors"
                  onClick={() => {
                    onSelect(sym);
                    setOpen(false);
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
