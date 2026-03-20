import { useState } from 'react';
import { Search, Edit3, Moon, Sun, LogOut, Settings, MessageSquareDashed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useRooms } from '@/hooks/useRooms';
import { NewChatModal } from './NewChatModal';
import { Avatar, Badge, Spinner, Tooltip } from '@/components/ui/index';
import { useDarkMode } from '@/hooks/useDarkMode';
import { format, isToday, isYesterday } from 'date-fns';
import clsx from 'clsx';
import type { Room } from '@electron-chat/types';

function formatTime(date: Date | string | undefined) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd/MM/yy');
  } catch { return ''; }
}

export function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { rooms, isLoading } = useRooms();
  const { activeRoomId, setActiveRoom, unreadCounts } = useChatStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const { dark, toggle } = useDarkMode();

  const filtered = rooms.filter((r) => {
    const other = r.members.find((m) => m.userId !== user?.id);
    const name = r.name ?? other?.user.name ?? '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}

      <aside className="flex flex-col w-[280px] min-w-[280px] h-full bg-sidebar border-r border-sidebar-border flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground">Electron Chat</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip label={dark ? 'Light mode' : 'Dark mode'}>
              <button onClick={toggle} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </Tooltip>
            <Tooltip label="New conversation">
              <button onClick={() => setShowNewChat(true)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Edit3 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-muted border border-border/50">
            <Search size={13} className="text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
          {isLoading && (
            <div className="flex justify-center p-6"><Spinner size="sm" /></div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center p-8 gap-2 opacity-40">
              <MessageSquareDashed size={28} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">
                {search ? `No results for "${search}"` : 'No conversations yet.\nClick ✏️ to start one!'}
              </p>
            </div>
          )}
          {filtered.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              currentUserId={user?.id ?? ''}
              isActive={room.id === activeRoomId}
              unread={unreadCounts[room.id] ?? 0}
              onClick={() => setActiveRoom(room.id)}
            />
          ))}
        </div>

        {/* User footer */}
        <div className="px-3 py-2.5 border-t border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Avatar src={user?.avatarUrl} name={user?.name} size="sm" online />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/settings')}>
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? user?.email}</p>
              <p className="text-xs text-muted-foreground">@{user?.username ?? '—'}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip label="Settings">
                <button onClick={() => navigate('/settings')} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Settings size={14} />
                </button>
              </Tooltip>
              <Tooltip label="Sign out">
                <button onClick={logout} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                  <LogOut size={14} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function RoomItem({ room, currentUserId, isActive, unread, onClick }: {
  room: Room; currentUserId: string; isActive: boolean; unread: number; onClick: () => void;
}) {
  const other = room.members.find((m) => m.userId !== currentUserId);
  const name = room.type === 'GROUP' ? (room.name ?? 'Group') : (other?.user.name ?? 'Unknown');
  const avatar = room.type === 'GROUP' ? room.avatarUrl : other?.user.avatarUrl;
  const isOnline = room.type === 'DIRECT' && (other?.user.isOnline ?? false);
  const lastMsg = room.lastMessage;

  const preview = (() => {
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.isDeleted) return 'Message deleted';
    if (lastMsg.type === 'IMAGE') return '📷 Image';
    if (lastMsg.type === 'FILE') return '📎 File';
    if (lastMsg.type === 'STICKER') return '🎭 Sticker';
    return lastMsg.content ?? '';
  })();

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors min-w-0',
        'border-l-2',
        isActive
          ? 'bg-primary/10 border-l-primary'
          : 'border-l-transparent hover:bg-muted/60'
      )}
    >
      <Avatar src={avatar} name={name} size="md" online={isOnline} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={clsx(
            'text-sm truncate',
            unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
          )}>
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {formatTime(lastMsg?.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs text-muted-foreground truncate flex-1">{preview}</span>
          {unread > 0 && <Badge>{unread > 99 ? '99+' : unread}</Badge>}
        </div>
      </div>
    </div>
  );
}
