import { useState, useEffect } from 'react';
import { X, Search, Check, Users } from 'lucide-react';
import { useUserSearch } from '@/hooks/useUserSearch';
import { useRooms } from '@/hooks/useRooms';
import { useChatStore } from '@/store/chatStore';
import { Avatar, Button, Spinner } from '@/components/ui/index';
import clsx from 'clsx';

interface Props { onClose: () => void; }

export function NewChatModal({ onClose }: Props) {
  const { query, setQuery, results, isLoading, reset } = useUserSearch();
  const { createDM, createGroup } = useRooms();
  const setActiveRoom = useChatStore(s => s.setActiveRoom);
  const [selected, setSelected] = useState<{ id: string; name: string; avatarUrl: string | null }[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const isGroup = selected.length > 1;

  useEffect(() => () => reset(), []);

  const toggle = (u: { id: string; name: string; avatarUrl: string | null }) => {
    setSelected(p => p.find(x => x.id === u.id) ? p.filter(x => x.id !== u.id) : [...p, u]);
  };

  const start = async () => {
    if (!selected.length) return;
    setError('');
    try {
      if (isGroup) {
        const room = await createGroup.mutateAsync({ name: groupName || selected.map(u => u.name).join(', '), memberIds: selected.map(u => u.id) });
        setActiveRoom(room.id);
      } else {
        const room = await createDM.mutateAsync(selected[0].id);
        setActiveRoom(room.id);
      }
      onClose();
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Failed to create conversation'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-popover border border-border rounded-2xl shadow-2xl w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <p className="font-semibold text-foreground">New conversation</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
          {/* Selected pills */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selected.map(u => (
                <button key={u.id} onClick={() => toggle(u)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors">
                  <Avatar src={u.avatarUrl} name={u.name} size="xs" />
                  {u.name}
                  <X size={11} />
                </button>
              ))}
            </div>
          )}

          {/* Group name */}
          {isGroup && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-muted border border-border">
              <Users size={15} className="text-muted-foreground flex-shrink-0" />
              <input
                placeholder="Group name (optional)"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-input-background border border-border mb-3">
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or @username…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-destructive mb-3">{error}</p>}

          {/* Results */}
          {isLoading && <div className="flex justify-center p-4"><Spinner size="sm" /></div>}
          {!isLoading && query.length >= 2 && !results.length && (
            <p className="text-sm text-muted-foreground text-center py-4">No users found for "{query}"</p>
          )}
          {!isLoading && query.length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-4">Type at least 2 characters to search</p>
          )}
          {results.map(u => {
            const isSelected = selected.some(s => s.id === u.id);
            return (
              <button key={u.id} onClick={() => toggle({ id: u.id, name: u.name, avatarUrl: u.avatarUrl ?? null })}
                className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors', isSelected ? 'bg-primary/8' : 'hover:bg-muted')}>
                <Avatar src={u.avatarUrl} name={u.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {isSelected && <Check size={16} className="text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!selected.length || createDM.isPending || createGroup.isPending}
            loading={createDM.isPending || createGroup.isPending} onClick={start}>
            {isGroup ? 'Create group' : 'Start chat'}
          </Button>
        </div>
      </div>
    </div>
  );
}
