import { useState } from 'react';
import { STICKER_PACKS, type Sticker } from '@/data/stickers';

interface Props { onSelect: (s: Sticker) => void; onClose: () => void; }

export function StickerPicker({ onSelect, onClose }: Props) {
  const [active, setActive] = useState(STICKER_PACKS[0].id);
  const pack = STICKER_PACKS.find(p => p.id === active)!;

  return (
    <div className="w-72 bg-popover border border-border rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
      {/* Tabs */}
      <div className="flex border-b border-border px-2 pt-2 gap-0.5">
        {STICKER_PACKS.map(p => (
          <button key={p.id} onClick={() => setActive(p.id)}
            className={`h-9 w-9 text-xl rounded-lg flex items-center justify-center transition-colors ${active === p.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
            {p.emoji}
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold text-muted-foreground px-3 py-1.5">{pack.name}</p>
      {/* Grid */}
      <div className="grid grid-cols-4 gap-1 px-2 pb-3 max-h-56 overflow-y-auto scrollbar-thin">
        {pack.stickers.map(s => (
          <button key={s.id} onClick={() => { onSelect(s); onClose(); }}
            className="p-1.5 rounded-xl hover:bg-muted hover:scale-110 transition-all duration-100 flex items-center justify-center">
            <img src={s.url} alt={s.alt} width={52} height={52} className="object-contain rounded" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
