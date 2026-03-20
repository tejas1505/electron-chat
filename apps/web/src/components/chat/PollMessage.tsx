import { useState } from 'react';
import { CheckCircle2, BarChart2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import clsx from 'clsx';

interface PollData {
  question: string;
  options: string[];
  votes: Record<number, number>;
  voters: Record<string, number>;
}

interface Props { messageId: string; content: string; isOwn: boolean; }

export function PollMessage({ messageId, content, isOwn }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const updateMessage = useChatStore((s) => s.updateMessage);
  const [voting, setVoting] = useState(false);

  let poll: PollData;
  try {
    poll = JSON.parse(content);
    if (!poll.question || !poll.options) throw new Error();
  } catch {
    return <p className="text-sm">{content}</p>;
  }

  const total = Object.values(poll.votes).reduce((a, b) => a + b, 0);
  const myVote = poll.voters?.[userId];
  const hasVoted = myVote !== undefined;

  const vote = async (i: number) => {
    if (voting) return;
    setVoting(true);
    try {
      const { data } = await api.patch(`/api/messages/${messageId}/poll/vote`, { optionIndex: i });
      updateMessage({ id: messageId, content: data.data.content } as any);
    } catch { console.error('Vote failed'); }
    finally { setVoting(false); }
  };

  const textColor = isOwn ? 'text-white' : 'text-foreground';
  const mutedColor = isOwn ? 'text-white/60' : 'text-muted-foreground';

  return (
    <div className="min-w-[210px] max-w-[260px]">
      {/* Question */}
      <div className="flex items-start gap-1.5 mb-3">
        <BarChart2 size={14} className={clsx('mt-0.5 flex-shrink-0', mutedColor)} />
        <p className={clsx('text-sm font-semibold leading-snug', textColor)}>{poll.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option, i) => {
          const count = poll.votes[i] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMyVote = myVote === i;
          const isWinning = hasVoted && count === Math.max(...Object.values(poll.votes));

          return (
            <div key={i} className="relative">
              {/* Progress bar */}
              {hasVoted && (
                <div
                  className={clsx(
                    'absolute inset-0 rounded-lg transition-all duration-500',
                    isOwn
                      ? isMyVote ? 'bg-white/25' : 'bg-white/10'
                      : isMyVote ? 'bg-primary/15' : 'bg-muted'
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <button
                onClick={() => !hasVoted && vote(i)}
                disabled={hasVoted || voting}
                className={clsx(
                  'relative w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all duration-150',
                  hasVoted
                    ? 'cursor-default'
                    : isOwn
                      ? 'border-white/20 hover:border-white/40 hover:bg-white/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted',
                  isMyVote
                    ? isOwn ? 'border-white/40' : 'border-primary/60'
                    : isOwn ? 'border-white/15' : 'border-border',
                )}
              >
                <div className="flex items-center gap-2">
                  {isMyVote && (
                    <CheckCircle2 size={13} className={isOwn ? 'text-white' : 'text-primary'} />
                  )}
                  <span className={clsx('text-sm', isMyVote ? (isOwn ? 'text-white font-medium' : 'text-primary font-medium') : textColor)}>
                    {option}
                  </span>
                </div>
                {hasVoted && (
                  <span className={clsx('text-xs font-semibold ml-2 flex-shrink-0', mutedColor)}>{pct}%</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Vote count */}
      <p className={clsx('text-[10px] mt-2', mutedColor)}>
        {total} {total === 1 ? 'vote' : 'votes'}
        {hasVoted ? ' · Tap to change' : ' · Tap to vote'}
      </p>
    </div>
  );
}
