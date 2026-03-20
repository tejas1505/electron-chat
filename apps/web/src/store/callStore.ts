import { create } from 'zustand';

export type CallState = 'idle' | 'calling' | 'incoming' | 'active';
export type CallType = 'audio' | 'video';

export interface CallInfo {
  callId: string;
  roomId: string;
  peerId: string;       // the other person's userId
  peerName: string;
  peerAvatar: string | null;
  type: CallType;
}

interface CallStore {
  callState: CallState;
  callInfo: CallInfo | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isPiP: boolean;
  callDuration: number; // seconds

  setCallState: (state: CallState) => void;
  setCallInfo: (info: CallInfo | null) => void;
  setMuted: (v: boolean) => void;
  setCameraOff: (v: boolean) => void;
  setScreenSharing: (v: boolean) => void;
  setPiP: (v: boolean) => void;
  setCallDuration: (v: number) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  callState: 'idle',
  callInfo: null,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isPiP: false,
  callDuration: 0,

  setCallState: (callState) => set({ callState }),
  setCallInfo: (callInfo) => set({ callInfo }),
  setMuted: (isMuted) => set({ isMuted }),
  setCameraOff: (isCameraOff) => set({ isCameraOff }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setPiP: (isPiP) => set({ isPiP }),
  setCallDuration: (callDuration) => set({ callDuration }),

  resetCall: () => set({
    callState: 'idle',
    callInfo: null,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    isPiP: false,
    callDuration: 0,
  }),
}));
