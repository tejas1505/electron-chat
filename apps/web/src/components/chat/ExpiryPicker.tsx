import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/index';
import clsx from 'clsx';

const OPTIONS = [
  { label: '5 seconds', value: 5 }, { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 }, { label: '5 minutes', value: 300 },
  { label: '1 hour', value: 3600 }, { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
];

export function ExpiryPicker({ onSelect, onClose }: { onSelect: (s: number) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border border-border rounded-2xl p-5 w-72 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <p className="font-semibold text-sm text-foreground">Disappearing message</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Message deletes after the selected time.</p>
        <div className="space-y-0.5">
          {OPTIONS.map(o => (
            <button key={o.value} onClick={() => { onSelect(o.value); onClose(); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
              <span>{o.label}</span>
              <span className="text-xs text-muted-foreground">
                {o.value < 60 ? `${o.value}s` : o.value < 3600 ? `${o.value/60}m` : o.value < 86400 ? `${o.value/3600}h` : `${o.value/86400}d`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
