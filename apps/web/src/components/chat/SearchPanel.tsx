import { useState, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { messagesApi } from '@/services/messages';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/index';
import type { Message } from '@electron-chat/types';

interface Props { roomId: string; onClose: () => void; onJumpTo: (id: string) => void; }

export function SearchPanel({ roomId, onClose, onJumpTo }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout>>();

  const search = (q: string) => {
    setQuery(q);
    clearTimeout(debRef.current);
    if (!q.trim() || q.length < 2) { setResults([]); setSearched(false); return; }
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try { const d = await messagesApi.search(roomId, q); setResults(d); setSearched(true); }
      catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-background border-l border-border flex flex-col z-20 shadow-xl">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
        <Search size={15} className="text-muted-foreground flex-shrink-0" />
        <input
          autoFocus value={query} onChange={e => search(e.target.value)}
          placeholder="Search messages…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && <div className="flex justify-center p-6"><Spinner size="sm" /></div>}
        {!loading && searched && !results.length && (
          <div className="text-center p-6 text-muted-foreground text-sm">No messages found for "{query}"</div>
        )}
        {results.map(msg => (
          <button key={msg.id} onClick={() => onJumpTo(msg.id)}
            className="w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted transition-colors">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-semibold text-primary">{msg.sender.name}</span>
              <span className="text-[10px] text-muted-foreground">{format(new Date(msg.createdAt), 'dd MMM, HH:mm')}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{msg.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
