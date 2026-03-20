import { useState, useEffect } from 'react';
import { SmilePlus, CornerUpLeft, MoreHorizontal, Clock, Download, ZoomIn } from 'lucide-react';
import { Avatar } from '@/components/ui/index';
import { ReactionPicker } from './ReactionPicker';
import { MessageContextMenu } from './MessageContextMenu';
import { ExpiryPicker } from './ExpiryPicker';
import { LinkPreview } from './LinkPreview';
import { PollMessage } from './PollMessage';
import { ImageViewer } from './ImageViewer';
import { messagesApi } from '@/services/messages';
import { getSocket, isSocketConnected } from '@/services/socket';
import { useChatStore } from '@/store/chatStore';
import clsx from 'clsx';
import type { Message } from '@electron-chat/types';

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

function isPoll(c: string) {
  try { const p = JSON.parse(c); return !!p.question && Array.isArray(p.options); } catch { return false; }
}

function safeTime(date: Date | string | undefined) {
  if (!date) return '';
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function timeLeft(exp: Date | string | null | undefined) {
  if (!exp) return null;
  try {
    const diff = new Date(exp).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const s = Math.floor(diff / 1000);
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
  } catch { return null; }
}

interface Props { message: Message; isOwn: boolean; showAvatar: boolean; onReply?: (m: Message) => void; }

export function MessageBubble({ message, isOwn, showAvatar, onReply }: Props) {
  const [hover, setHover] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showExpiry, setShowExpiry] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [expiry, setExpiry] = useState(() => timeLeft(message.expiresAt));
  const del = useChatStore(s => s.deleteMessage);

  useEffect(() => {
    if (!message.expiresAt) return;
    const id = setInterval(() => setExpiry(timeLeft(message.expiresAt)), 1000);
    return () => clearInterval(id);
  }, [message.expiresAt]);

  const isDeleted = message.isDeleted;
  const isSticker = message.type === 'STICKER';
  const isImage = message.type === 'IMAGE' && message.mediaUrl;
  const isFile = message.type === 'FILE' && message.mediaUrl;
  const poll = !isDeleted && message.type === 'TEXT' && isPoll(message.content);
  const urls = (!isDeleted && !poll && message.type === 'TEXT')
    ? (message.content.match(URL_REGEX) ?? []).slice(0, 1) : [];

  const emit = (event: string, data: any) => {
    if (isSocketConnected()) try { getSocket().emit(event as any, data); } catch {}
  };

  const renderText = (text: string) =>
    text.split(/(@\w+)/g).map((p, i) =>
      p.startsWith('@')
        ? <span key={i} className={clsx('font-semibold', isOwn ? 'text-white/90' : 'text-primary')}>{p}</span>
        : <span key={i}>{p}</span>
    );

  return (
    <>
      {lightbox && <ImageViewer src={lightbox} onClose={() => setLightbox(null)} />}

      <div
        id={`msg-${message.id}`}
        className={clsx('flex items-end gap-2 mb-0.5 msg-enter group', isOwn ? 'flex-row-reverse' : 'flex-row')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setShowReactions(false); }}
        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
      >
        {/* Avatar */}
        {!isOwn && (
          <div className="w-8 flex-shrink-0 self-end mb-1">
            {showAvatar && <Avatar src={message.sender?.avatarUrl} name={message.sender?.name} size="sm" />}
          </div>
        )}

        <div className={clsx('max-w-[65%] relative', isSticker && 'max-w-[120px]')}>
          {/* Sender name */}
          {!isOwn && showAvatar && !isDeleted && (
            <p className="text-[11px] font-semibold text-primary mb-1 ml-1">{message.sender?.name}</p>
          )}

          {/* Reply preview */}
          {message.replyTo && !isDeleted && (
            <div className={clsx(
              'mb-1 px-2.5 py-1.5 rounded-lg border-l-2',
              isOwn ? 'bg-white/10 border-white/40' : 'bg-muted border-primary'
            )}>
              <p className={clsx('text-[11px] font-semibold mb-0.5', isOwn ? 'text-white/80' : 'text-primary')}>
                {message.replyTo.sender?.name}
              </p>
              <p className={clsx('text-[11px] truncate', isOwn ? 'text-white/60' : 'text-muted-foreground')}>
                {message.replyTo.content}
              </p>
            </div>
          )}

          {/* Bubble */}
          <div className={clsx(
            'relative',
            !isSticker && [
              'px-3 py-2 rounded-2xl',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-secondary text-secondary-foreground rounded-bl-sm border border-border/50',
            ]
          )}>
            {isDeleted ? (
              <p className="text-sm italic opacity-50">Message deleted</p>
            ) : isSticker && message.mediaUrl ? (
              <img src={message.mediaUrl} alt="Sticker" className="w-24 h-24 object-contain" />
            ) : isImage ? (
              <div>
                <div className="relative group/img cursor-zoom-in" onClick={() => setLightbox(message.mediaUrl!)}>
                  <img src={message.mediaUrl!} alt="Image"
                    className="max-w-full max-h-64 rounded-xl object-cover block" loading="lazy" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20 rounded-xl">
                    <ZoomIn size={20} className="text-white drop-shadow" />
                  </div>
                </div>
                {message.content && <p className="text-sm mt-1.5">{renderText(message.content)}</p>}
              </div>
            ) : isFile ? (
              <a href={message.mediaUrl!} target="_blank" rel="noopener noreferrer"
                className={clsx('flex items-center gap-2.5 no-underline', isOwn ? 'text-white' : 'text-foreground')}>
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Download size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[160px]">{message.content || 'File'}</p>
                  <p className="text-[11px] opacity-60">Click to download</p>
                </div>
              </a>
            ) : poll ? (
              <PollMessage messageId={message.id} content={message.content} isOwn={isOwn} />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderText(message.content)}</p>
            )}

            {/* Timestamp */}
            {!isSticker && !isDeleted && (
              <div className={clsx('flex items-center justify-end gap-1 mt-1', isOwn ? 'text-white/50' : 'text-muted-foreground')}>
                {expiry && (
                  <span className="flex items-center gap-0.5 text-[10px]">
                    <Clock size={9} />{expiry}
                  </span>
                )}
                <span className="text-[10px]">{safeTime(message.createdAt)}</span>
                {isOwn && (
                  <span className="text-[10px]">{message.status === 'READ' ? '✓✓' : '✓'}</span>
                )}
              </div>
            )}
          </div>

          {/* Link preview */}
          {urls.length > 0 && <LinkPreview url={urls[0]} isOwn={isOwn} />}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={clsx('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
              {message.reactions.map(r => (
                <button key={r.emoji}
                  onClick={() => emit('message:react', { messageId: message.id, emoji: r.emoji })}
                  className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-muted border border-border hover:border-primary transition-colors">
                  <span>{r.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hover actions */}
          {hover && !isDeleted && (
            <div className={clsx(
              'absolute -top-8 flex items-center gap-0.5',
              'bg-popover border border-border rounded-lg px-1.5 py-1 shadow-md z-10',
              isOwn ? 'left-0' : 'right-0'
            )}>
              <button onClick={e => { e.stopPropagation(); setShowReactions(v => !v); }}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <SmilePlus size={14} />
              </button>
              <button onClick={() => onReply?.(message)}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <CornerUpLeft size={14} />
              </button>
              <button onClick={e => setContextMenu({ x: e.clientX, y: e.clientY })}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <MoreHorizontal size={14} />
              </button>
            </div>
          )}

          {/* Reaction picker */}
          {showReactions && (
            <ReactionPicker messageId={message.id} isOwn={isOwn} onClose={() => setShowReactions(false)} />
          )}
        </div>

        {contextMenu && (
          <MessageContextMenu
            message={message} isOwn={isOwn} position={contextMenu}
            onClose={() => setContextMenu(null)}
            onReply={() => onReply?.(message)}
            onDelete={async () => { try { await messagesApi.delete(message.id); del(message.id, message.roomId); } catch {} }}
            onCopy={() => navigator.clipboard.writeText(message.content).catch(() => {})}
            onSetExpiry={() => { setContextMenu(null); setShowExpiry(true); }}
          />
        )}
        {showExpiry && (
          <ExpiryPicker
            onSelect={s => { emit('message:send', { roomId: message.roomId, content: message.content, type: message.type, expiresIn: s }); }}
            onClose={() => setShowExpiry(false)}
          />
        )}
      </div>
    </>
  );
}
