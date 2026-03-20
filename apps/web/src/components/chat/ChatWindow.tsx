import { useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChatStore } from '@/store/chatStore';
import type { Message } from '@electron-chat/types';

export function ChatWindow({ roomId }: { roomId: string }) {
  const rooms = useChatStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === roomId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <ChatHeader room={room} />
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <MessageList roomId={roomId} onReply={setReplyTo} />
      </div>
      <MessageInput
        roomId={roomId}
        members={room?.members}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}
