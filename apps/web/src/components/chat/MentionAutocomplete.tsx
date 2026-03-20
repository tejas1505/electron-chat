import { Avatar } from '@/components/ui/index';
import type { RoomMember } from '@electron-chat/types';

interface Props { members: RoomMember[]; query: string; onSelect: (m: RoomMember) => void; visible: boolean; }

export function MentionAutocomplete({ members, query, onSelect, visible }: Props) {
  if (!visible) return null;
  const filtered = members.filter(m =>
    m.user.name.toLowerCase().includes(query.toLowerCase()) ||
    m.user.username.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);
  if (!filtered.length) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mx-2 mb-1 bg-popover border border-border rounded-xl overflow-hidden shadow-xl z-50">
      <p className="text-[10px] font-semibold text-muted-foreground px-3 pt-2 pb-1 uppercase tracking-wider">Mention someone</p>
      {filtered.map(m => (
        <button key={m.userId} onClick={() => onSelect(m)}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left">
          <Avatar src={m.user.avatarUrl} name={m.user.name} size="sm" online={m.user.isOnline} />
          <div>
            <p className="text-sm font-medium text-foreground">{m.user.name}</p>
            <p className="text-xs text-muted-foreground">@{m.user.username}</p>
          </div>
          {m.user.isOnline && <span className="ml-auto text-[10px] text-online font-medium">Online</span>}
        </button>
      ))}
    </div>
  );
}
