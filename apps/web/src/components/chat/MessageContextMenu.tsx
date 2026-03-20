import { CornerUpLeft, Copy, Timer, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import type { Message } from '@electron-chat/types';

interface Props {
  message: Message; isOwn: boolean;
  position: { x: number; y: number };
  onClose: () => void; onReply: () => void;
  onDelete: () => void; onCopy: () => void; onSetExpiry: () => void;
}

export function MessageContextMenu({ isOwn, position, onClose, onReply, onDelete, onCopy, onSetExpiry }: Props) {
  const items = [
    { icon: CornerUpLeft, label: 'Reply', action: onReply },
    { icon: Copy, label: 'Copy text', action: onCopy },
    ...(isOwn ? [
      { icon: Timer, label: 'Set expiry', action: onSetExpiry, divider: true },
      { icon: Trash2, label: 'Delete', action: onDelete, danger: true },
    ] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-popover border border-border rounded-xl py-1 min-w-[160px] shadow-xl"
        style={{ left: Math.min(position.x, window.innerWidth - 180), top: Math.min(position.y, window.innerHeight - 200) }}
      >
        {items.map((item, i) => (
          <div key={item.label}>
            {item.divider && <div className="h-px bg-border mx-2 my-1" />}
            <button
              onClick={() => { item.action(); onClose(); }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left',
                item.danger ? 'text-destructive' : 'text-foreground'
              )}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
