import { useSocket } from '@/hooks/useSocket';
import { useRooms } from '@/hooks/useRooms';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CallManager } from '@/components/calls/CallManager';
import { useChatStore } from '@/store/chatStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { MessageSquareDashed } from 'lucide-react';

export function ChatLayout() {
  useSocket();
  useRooms();
  useDarkMode(); // Applies dark class on load from localStorage

  const activeRoomId = useChatStore((s) => s.activeRoomId);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <CallManager />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
        {activeRoomId ? (
          <ChatWindow roomId={activeRoomId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
            <MessageSquareDashed size={52} className="text-border" />
            <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
