import { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallStore } from '@/store/callStore';
import { Avatar } from '@/components/ui/index';

interface Props { onAccept: () => void; onDecline: () => void; }

export function IncomingCallScreen({ onAccept, onDecline }: Props) {
  const { callInfo } = useCallStore();

  // AudioContext ringtone
  useEffect(() => {
    let stopped = false;
    const ctx = new AudioContext();

    const beep = () => {
      if (stopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      setTimeout(() => beep(), 1800);
    };
    beep();

    return () => { stopped = true; ctx.close(); };
  }, []);

  if (!callInfo) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-7 p-10 bg-card border border-border rounded-3xl shadow-2xl min-w-[300px]">
        {/* Pulsing avatar */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-28 w-28 rounded-full border-2 border-primary/40 animate-[pulse-ring_1.5s_ease-in-out_infinite]" />
          <div className="absolute h-36 w-36 rounded-full border-2 border-primary/20 animate-[pulse-ring_1.5s_ease-in-out_infinite_0.3s]" />
          <Avatar src={callInfo.peerAvatar} name={callInfo.peerName} size="2xl" />
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground">{callInfo.peerName}</p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            {callInfo.type === 'video'
              ? <><Video size={14} /> Incoming video call…</>
              : <><Phone size={14} /> Incoming audio call…</>
            }
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-12">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onDecline}
              className="h-16 w-16 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg shadow-destructive/30 hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <PhoneOff size={24} />
            </button>
            <span className="text-xs text-muted-foreground">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="h-16 w-16 rounded-full bg-online text-white flex items-center justify-center shadow-lg shadow-green-500/30 hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              {callInfo.type === 'video' ? <Video size={24} /> : <Phone size={24} />}
            </button>
            <span className="text-xs text-muted-foreground">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
