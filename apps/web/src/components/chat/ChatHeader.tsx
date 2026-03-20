import { useState } from 'react';
import { Search, BarChart2, Phone, Video, MoreVertical, ChevronLeft } from 'lucide-react';
import { Avatar, IconButton, Tooltip } from '@/components/ui/index';
import { useAuthStore } from '@/store/authStore';
import { useCallStore } from '@/store/callStore';
import { SearchPanel } from './SearchPanel';
import { PollCreator } from './PollCreator';
import type { Room } from '@electron-chat/types';

interface Props { room?: Room; }

export function ChatHeader({ room }: Props) {
  const [showSearch, setShowSearch] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const callState = useCallStore((s) => s.callState);

  if (!room) return <div className="h-16 border-b border-border bg-background flex-shrink-0" />;

  const other = room.type === 'DIRECT' ? room.members.find(m => m.userId !== currentUserId) : null;
  const name = room.type === 'GROUP' ? (room.name ?? 'Group Chat') : (other?.user.name ?? 'Chat');
  const avatar = room.type === 'GROUP' ? room.avatarUrl : other?.user.avatarUrl;
  const isOnline = room.type === 'DIRECT' && (other?.user.isOnline ?? false);
  const onlineCount = room.type === 'GROUP' ? room.members.filter(m => m.user.isOnline).length : 0;
  const subtitle = room.type === 'GROUP'
    ? `${room.members.length} members${onlineCount > 0 ? ` · ${onlineCount} online` : ''}`
    : isOnline ? 'Online' : 'Offline';

  const startCall = (type: 'audio' | 'video') => {
    if (callState !== 'idle' || !other?.userId) return;
    window.dispatchEvent(new CustomEvent('electron-chat:start-call', {
      detail: { targetUserId: other.userId, roomId: room.id, type },
    }));
  };

  return (
    <div className="relative flex-shrink-0">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border bg-background">
        <Avatar src={avatar} name={name} size="md" online={isOnline} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
          <p className={clsx('text-xs', isOnline ? 'text-online' : 'text-muted-foreground')}>
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip label="Search messages">
            <IconButton size="sm" active={showSearch} onClick={() => setShowSearch(v => !v)}>
              <Search size={17} />
            </IconButton>
          </Tooltip>
          <Tooltip label="Create poll">
            <IconButton size="sm" onClick={() => setShowPoll(true)}>
              <BarChart2 size={17} />
            </IconButton>
          </Tooltip>
          {room.type === 'DIRECT' && (
            <>
              <Tooltip label="Voice call">
                <IconButton size="sm" onClick={() => startCall('audio')} disabled={callState !== 'idle'}>
                  <Phone size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip label="Video call">
                <IconButton size="sm" onClick={() => startCall('video')} disabled={callState !== 'idle'}>
                  <Video size={17} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip label="More options">
            <IconButton size="sm"><MoreVertical size={17} /></IconButton>
          </Tooltip>
        </div>
      </div>

      {showSearch && (
        <SearchPanel
          roomId={room.id}
          onClose={() => setShowSearch(false)}
          onJumpTo={(id) => {
            document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setShowSearch(false);
          }}
        />
      )}
      {showPoll && <PollCreator roomId={room.id} onClose={() => setShowPoll(false)} />}
    </div>
  );
}

import clsx from 'clsx';
