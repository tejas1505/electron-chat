import { getSocket, isSocketConnected } from '@/services/socket';
import { QUICK_REACTIONS } from '@/data/stickers';
import clsx from 'clsx';

interface Props { messageId: string; isOwn: boolean; onClose: () => void; }

export function ReactionPicker({ messageId, isOwn, onClose }: Props) {
  const react = (emoji: string) => {
    if (isSocketConnected()) try { getSocket().emit('message:react', { messageId, emoji }); } catch {}
    onClose();
  };

  return (
    <div className={clsx(
      'absolute -top-11 flex items-center gap-0.5 bg-popover border border-border rounded-full px-2 py-1.5 shadow-lg z-20',
      isOwn ? 'left-0' : 'right-0'
    )}>
      {QUICK_REACTIONS.map(emoji => (
        <button key={emoji} onClick={() => react(emoji)}
          className="h-7 w-7 flex items-center justify-center text-lg rounded-full hover:bg-muted hover:scale-125 transition-all duration-100">
          {emoji}
        </button>
      ))}
    </div>
  );
}
