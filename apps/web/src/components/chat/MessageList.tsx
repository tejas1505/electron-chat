import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useMessages } from '@/hooks/useMessages';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Spinner } from '@/components/ui/index';
import { MessageSquare } from 'lucide-react';
import type { Message } from '@electron-chat/types';

interface Props { roomId: string; onReply: (m: Message) => void; }

export function MessageList({ roomId, onReply }: Props) {
  const messages = useChatStore((s) => s.messages[roomId] ?? []);
  const typingUsers = useChatStore((s) => s.typingUsers.filter((t) => t.roomId === roomId));
  const userId = useAuthStore((s) => s.user?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isLoading, fetchMore, hasMore, isFetchingMore } = useMessages(roomId);
  const prevLengthRef = useRef(0);
  const atBottomRef = useRef(true);

  useEffect(() => {
    if (messages.length > prevLengthRef.current && atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    prevLengthRef.current = 0;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
  }, [roomId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (el.scrollTop < 80 && hasMore && !isFetchingMore) {
      const prev = el.scrollHeight;
      fetchMore().then(() => requestAnimationFrame(() => { el.scrollTop = el.scrollHeight - prev; }));
    }
  }, [hasMore, isFetchingMore, fetchMore]);

  if (isLoading) return (
    <div className="flex h-full items-center justify-center">
      <Spinner size="md" />
    </div>
  );

  return (
    <div ref={containerRef} onScroll={handleScroll}
      className="flex flex-col h-full overflow-y-auto px-4 py-3 scrollbar-thin">
      {isFetchingMore && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}

      {/* Push messages to bottom */}
      <div className="flex-1" />

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-40">
          <MessageSquare size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const showAvatar = !prev || prev.senderId !== msg.senderId;
        const isLastInGroup = !next || next.senderId !== msg.senderId;
        return (
          <div key={msg.id} className={isLastInGroup ? 'mb-2' : 'mb-0.5'}>
            <MessageBubble message={msg} isOwn={msg.senderId === userId} showAvatar={showAvatar} onReply={onReply} />
          </div>
        );
      })}

      {typingUsers.length > 0 && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
