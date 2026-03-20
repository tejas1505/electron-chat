import { useEffect, useRef } from 'react';
import {
  MicOff, Mic, VideoOff, Video, Monitor, MonitorOff,
  Minimize2, Maximize2, PhoneOff,
} from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import { Avatar } from '@/components/ui/index';
import clsx from 'clsx';

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onTogglePiP: () => void;
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function ActiveCallScreen({
  localStream, remoteStream,
  onEndCall, onToggleMute, onToggleCamera, onToggleScreenShare, onTogglePiP,
}: Props) {
  const { callInfo, callState, isMuted, isCameraOff, isScreenSharing, isPiP, callDuration } = useCallStore();
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  if (!callInfo) return null;

  const isVideo = callInfo.type === 'video';
  const isConnecting = callState === 'calling';

  const CallBtn = ({ icon: Icon, activeIcon: ActiveIcon, label, active, danger, onClick }: {
    icon: React.ElementType; activeIcon?: React.ElementType;
    label: string; active?: boolean; danger?: boolean; onClick: () => void;
  }) => {
    const I = (active && ActiveIcon) ? ActiveIcon : Icon;
    return (
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={onClick}
          className={clsx(
            'h-14 w-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95',
            danger
              ? 'bg-destructive text-white hover:opacity-90 shadow-lg shadow-destructive/30'
              : active
                ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                : 'bg-white/10 text-white hover:bg-white/20'
          )}
        >
          <I size={22} />
        </button>
        <span className="text-[11px] text-white/60 font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className={clsx(
      'fixed z-[900] bg-gray-900 overflow-hidden transition-all duration-300',
      isPiP
        ? 'bottom-6 right-6 w-72 h-44 rounded-2xl shadow-2xl border border-white/10'
        : 'inset-0'
    )}>
      {/* Remote — video or audio bg */}
      {isVideo ? (
        <video ref={remoteRef} autoPlay playsInline
          className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="relative">
            <div className={clsx(
              'absolute h-28 w-28 rounded-full border-2 border-primary/40',
              callState === 'active' && 'animate-[pulse-ring_2s_ease-in-out_infinite]'
            )} />
            <Avatar src={callInfo.peerAvatar} name={callInfo.peerName} size="2xl" />
          </div>
          <div className="text-center">
            <p className="text-white text-xl font-semibold">{callInfo.peerName}</p>
            <p className="text-white/50 text-sm mt-1">
              {isConnecting ? 'Calling…' : formatDuration(callDuration)}
            </p>
          </div>
        </div>
      )}

      {/* Local PiP for video */}
      {isVideo && !isPiP && (
        <div
          className="absolute bottom-24 right-4 w-28 h-20 rounded-xl overflow-hidden border border-white/20 shadow-xl cursor-pointer bg-gray-800"
          onClick={onTogglePiP}
        >
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff size={20} className="text-white/40" />
            </div>
          ) : (
            <video ref={localRef} autoPlay playsInline muted
              className="w-full h-full object-cover scale-x-[-1]" />
          )}
        </div>
      )}

      {/* Video overlay — name + duration */}
      {isVideo && !isPiP && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
          <p className="text-white font-semibold">{callInfo.peerName}</p>
          <p className="text-white/60 text-sm">
            {isConnecting ? 'Connecting…' : formatDuration(callDuration)}
          </p>
        </div>
      )}

      {/* Controls */}
      {!isPiP && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="flex items-end justify-center gap-5">
            <CallBtn icon={Mic} activeIcon={MicOff} label={isMuted ? 'Unmute' : 'Mute'} active={isMuted} onClick={onToggleMute} />
            {isVideo && (
              <CallBtn icon={Video} activeIcon={VideoOff} label={isCameraOff ? 'Camera on' : 'Camera off'} active={isCameraOff} onClick={onToggleCamera} />
            )}
            {isVideo && (
              <CallBtn icon={Monitor} activeIcon={MonitorOff} label={isScreenSharing ? 'Stop share' : 'Share'} active={isScreenSharing} onClick={onToggleScreenShare} />
            )}
            <CallBtn icon={Minimize2} label="Minimise" onClick={onTogglePiP} />
            <CallBtn icon={PhoneOff} label="End" danger onClick={onEndCall} />
          </div>
        </div>
      )}

      {/* PiP overlay */}
      {isPiP && (
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={onTogglePiP}>
          <Maximize2 size={16} className="text-white" />
          <button
            onClick={e => { e.stopPropagation(); onEndCall(); }}
            className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center"
          >
            <PhoneOff size={14} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
