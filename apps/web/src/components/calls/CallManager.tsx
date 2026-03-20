import { useEffect, useRef, useCallback } from 'react';
import { useCallStore } from '@/store/callStore';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { getSocket, isSocketConnected } from '@/services/socket';
import { IncomingCallScreen } from './IncomingCallScreen';
import { ActiveCallScreen } from './ActiveCallScreen';
import { v4 as uuidv4 } from 'uuid';
import type { CallPayload, SignalPayload } from '@electron-chat/types';

export function CallManager() {
  const { callState, callInfo, setCallState, setCallInfo, setPiP, isPiP, resetCall } = useCallStore();
  const user = useAuthStore((s) => s.user);
  const rooms = useChatStore((s) => s.rooms);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const {
    localStream, remoteStream,
    startCall, answerCall, handleSignal, endCall,
    toggleMute, toggleCamera, toggleScreenShare,
  } = useWebRTC();

  // ── Socket listeners ──────────────────────────────────────
  useEffect(() => {
    if (!isSocketConnected()) return;
    const socket = getSocket();

    const onIncoming = (payload: CallPayload) => {
      if (callState !== 'idle') {
        // Auto-decline busy
        socket.emit('call:signal', { callId: payload.callId, targetUserId: payload.callerId, signal: { type: 'answer', sdp: '' } as any });
        return;
      }
      const peer = rooms.flatMap(r => r.members).find(m => m.userId === payload.callerId)?.user;
      setCallInfo({ callId: payload.callId, roomId: payload.roomId, peerId: payload.callerId, peerName: peer?.name ?? 'Unknown', peerAvatar: peer?.avatarUrl ?? null, type: payload.type });
      setCallState('incoming');
    };

    const onSignal = async (payload: SignalPayload) => {
      if ('type' in payload.signal && (payload.signal as RTCSessionDescriptionInit).type === 'offer') {
        pendingOfferRef.current = payload.signal as RTCSessionDescriptionInit;
      } else {
        await handleSignal(payload.signal);
      }
    };

    const onEnded = () => endCall();

    socket.on('call:incoming', onIncoming);
    socket.on('call:signal', onSignal);
    socket.on('call:ended', onEnded);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:signal', onSignal);
      socket.off('call:ended', onEnded);
    };
  }, [callState, rooms, setCallInfo, setCallState, handleSignal, endCall]);

  // ── Custom event: start call from ChatHeader ──────────────
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { targetUserId, roomId, type } = e.detail;
      const callId = uuidv4();
      const peer = rooms.flatMap(r => r.members).find(m => m.userId === targetUserId)?.user;
      setCallInfo({ callId, roomId, peerId: targetUserId, peerName: peer?.name ?? 'Unknown', peerAvatar: peer?.avatarUrl ?? null, type });
      startCall(targetUserId, callId, type, roomId);
    };
    window.addEventListener('electron-chat:start-call', handler as EventListener);
    return () => window.removeEventListener('electron-chat:start-call', handler as EventListener);
  }, [rooms, setCallInfo, startCall]);

  const handleAccept = useCallback(async () => {
    if (!callInfo || !pendingOfferRef.current) return;
    await answerCall(callInfo.peerId, callInfo.callId, pendingOfferRef.current, callInfo.type);
    pendingOfferRef.current = null;
  }, [callInfo, answerCall]);

  const handleDecline = useCallback(() => {
    if (callInfo && isSocketConnected()) getSocket().emit('call:end', { callId: callInfo.callId });
    resetCall();
  }, [callInfo, resetCall]);

  const handleEnd = useCallback(() => {
    if (callInfo && isSocketConnected()) getSocket().emit('call:end', { callId: callInfo.callId });
    endCall();
  }, [callInfo, endCall]);

  if (callState === 'idle') return null;

  return (
    <>
      {callState === 'incoming' && (
        <IncomingCallScreen onAccept={handleAccept} onDecline={handleDecline} />
      )}
      {(callState === 'calling' || callState === 'active') && (
        <ActiveCallScreen
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={handleEnd}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreenShare}
          onTogglePiP={() => setPiP(!isPiP)}
        />
      )}
    </>
  );
}
