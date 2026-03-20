import { useRef, useState, useCallback, useEffect } from 'react';
import { getSocket, isSocketConnected } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { useCallStore } from '@/store/callStore';
import type { CallType } from '@/store/callStore';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC() {
  const userId = useAuthStore((s) => s.user?.id);
  const { setCallState, setMuted, setCameraOff, setScreenSharing, setCallDuration, resetCall } = useCallStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval>>();
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Duration timer
  const startDurationTimer = useCallback(() => {
    let secs = 0;
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      secs++;
      setCallDuration(secs);
    }, 1000);
  }, [setCallDuration]);

  const stopDurationTimer = useCallback(() => {
    clearInterval(durationTimerRef.current);
    setCallDuration(0);
  }, [setCallDuration]);

  // Create RTCPeerConnection
  const createPC = useCallback((targetUserId: string, callId: string): RTCPeerConnection => {
    // Clean up any existing connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remote = new MediaStream();
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && isSocketConnected()) {
        try {
          getSocket().emit('call:signal', {
            callId,
            targetUserId,
            signal: event.candidate.toJSON(),
          });
        } catch {}
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('active');
        startDurationTimer();
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    pcRef.current = pc;
    pendingCandidatesRef.current = [];
    return pc;
  }, [setCallState, startDurationTimer]);

  // Get user media
  const getMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // Initiate outgoing call
  const startCall = useCallback(async (
    targetUserId: string,
    callId: string,
    type: CallType,
    roomId: string
  ) => {
    try {
      setCallState('calling');
      const stream = await getMedia(type);
      const pc = createPC(targetUserId, callId);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
      await pc.setLocalDescription(offer);

      if (isSocketConnected()) {
        getSocket().emit('call:initiate', { callId, roomId, callerId: userId!, receiverId: targetUserId, type });
        getSocket().emit('call:signal', { callId, targetUserId, signal: offer });
      }
    } catch (err) {
      console.error('startCall error:', err);
      endCall();
    }
  }, [userId, getMedia, createPC, setCallState]);

  // Answer incoming call
  const answerCall = useCallback(async (
    callerId: string,
    callId: string,
    offer: RTCSessionDescriptionInit,
    type: CallType
  ) => {
    try {
      setCallState('active');
      const stream = await getMedia(type);
      const pc = createPC(callerId, callId);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush any ICE candidates that arrived before remote description
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (isSocketConnected()) {
        getSocket().emit('call:signal', { callId, targetUserId: callerId, signal: answer });
      }
      startDurationTimer();
    } catch (err) {
      console.error('answerCall error:', err);
      endCall();
    }
  }, [getMedia, createPC, setCallState, startDurationTimer]);

  // Handle incoming signal (offer, answer, or ICE candidate)
  const handleSignal = useCallback(async (
    signal: RTCSessionDescriptionInit | RTCIceCandidateInit
  ) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if ('type' in signal) {
        // SDP offer or answer
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        if (signal.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
        }
      } else {
        // ICE candidate
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal)).catch(() => {});
        } else {
          // Queue until remote description is set
          pendingCandidatesRef.current.push(signal);
        }
      }
    } catch (err) {
      console.error('handleSignal error:', err);
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    stopDurationTimer();
    resetCall();
  }, [resetCall, stopDurationTimer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = stream.getAudioTracks()[0]?.enabled ?? true;
    stream.getAudioTracks().forEach((t) => { t.enabled = !enabled; });
    setMuted(enabled); // muted = was enabled, now disabled
  }, [setMuted]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = stream.getVideoTracks()[0]?.enabled ?? true;
    stream.getVideoTracks().forEach((t) => { t.enabled = !enabled; });
    setCameraOff(enabled);
  }, [setCameraOff]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (screenStreamRef.current) {
      // Stop screen sharing — switch back to camera
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);

      const cameraStream = localStreamRef.current;
      if (cameraStream) {
        const videoTrack = cameraStream.getVideoTracks()[0];
        if (videoTrack) {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          await sender?.replaceTrack(videoTrack);
        }
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screen;
        setScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        await sender?.replaceTrack(screenTrack);

        // Auto-stop when user clicks browser "Stop sharing"
        screenTrack.onended = () => toggleScreenShare();
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  }, [setScreenSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    localStream,
    remoteStream,
    startCall,
    answerCall,
    handleSignal,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  };
}
