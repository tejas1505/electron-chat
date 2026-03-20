import { useState, useRef, KeyboardEvent, useCallback } from 'react';
import {
  Paperclip, Smile, Sticker, Timer, Send, X, Reply, CornerUpLeft,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useTyping } from '@/hooks/useTyping';
import { getSocket, isSocketConnected } from '@/services/socket';
import { useDropzone } from 'react-dropzone';
import { api } from '@/services/api';
import { StickerPicker } from './StickerPicker';
import { MentionAutocomplete } from './MentionAutocomplete';
import { IconButton } from '@/components/ui/index';
import clsx from 'clsx';
import type { Message, RoomMember } from '@electron-chat/types';
import type { Sticker as StickerType } from '@/data/stickers';

interface Props {
  roomId: string;
  members?: RoomMember[];
  replyTo?: Message | null;
  onClearReply?: () => void;
}

const EXPIRY_PRESETS = [
  { label: 'Off', value: undefined },
  { label: '1 min', value: 60 },
  { label: '1 hr', value: 3600 },
  { label: '24 hr', value: 86400 },
];

export function MessageInput({ roomId, members = [], replyTo, onClearReply }: Props) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showExpiryMenu, setShowExpiryMenu] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { onType, stopTyping } = useTyping(roomId);

  const handleChange = (value: string) => {
    setContent(value);
    onType();
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    // @mention detection
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const m = before.match(/@(\w*)$/);
    if (m) { setMentionQuery(m[1]); setMentionStartIdx(before.lastIndexOf('@')); setShowMentions(true); }
    else { setShowMentions(false); setMentionQuery(''); }
  };

  const insertMention = useCallback((member: RoomMember) => {
    const before = content.slice(0, mentionStartIdx);
    const after = content.slice(mentionStartIdx + mentionQuery.length + 1);
    setContent(`${before}@${member.user.username} ${after}`);
    setShowMentions(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [content, mentionStartIdx, mentionQuery]);

  const send = (msgContent: string, type = 'TEXT', extras?: Record<string, any>) => {
    if (!isSocketConnected()) return false;
    const mentionedUsernames = (msgContent.match(/@(\w+)/g) ?? []).map(m => m.slice(1));
    const mentions = members.filter(m => mentionedUsernames.includes(m.user.username)).map(m => m.userId);
    try {
      getSocket().emit('message:send', { roomId, content: msgContent, type: type as any, mentions, replyToId: replyTo?.id, expiresIn, ...extras });
      return true;
    } catch { return false; }
  };

  const handleSend = () => {
    const t = content.trim();
    if (!t || isUploading) return;
    if (send(t)) {
      setContent('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setExpiresIn(undefined);
      onClearReply?.();
      stopTyping();
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { setShowMentions(false); setShowEmoji(false); setShowStickers(false); }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!showMentions) handleSend(); }
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/api/messages/upload', form);
      send(file.name, file.type.startsWith('image/') ? 'IMAGE' : 'FILE', { mediaUrl: data.data.url, mediaType: file.type });
    } finally { setIsUploading(false); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true, accept: { 'image/*': [], 'video/*': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024, onDrop: files => { if (files[0]) handleFile(files[0]); },
  });

  const hasContent = content.trim().length > 0;

  return (
    <div className="flex-shrink-0 border-t border-border bg-background px-3 py-3 relative">
      {/* Mention autocomplete */}
      <MentionAutocomplete members={members} query={mentionQuery} onSelect={insertMention} visible={showMentions && members.length > 0} />

      {/* Pickers */}
      {showEmoji && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPicker onEmojiClick={(d: EmojiClickData) => { setContent(p => p + d.emoji); setShowEmoji(false); textareaRef.current?.focus(); }}
            theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT} lazyLoadEmojis height={360} />
        </div>
      )}
      {showStickers && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <StickerPicker
            onSelect={(s: StickerType) => { send(s.alt, 'STICKER', { mediaUrl: s.url, mediaType: 'image/webp' }); setShowStickers(false); }}
            onClose={() => setShowStickers(false)}
          />
        </div>
      )}
      {showExpiryMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowExpiryMenu(false)} />
          <div className="absolute bottom-full right-3 mb-2 z-50 bg-popover border border-border rounded-xl py-1 min-w-[130px] shadow-lg">
            {EXPIRY_PRESETS.map(p => (
              <button key={String(p.value)} onClick={() => { setExpiresIn(p.value); setShowExpiryMenu(false); }}
                className={clsx('w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors',
                  expiresIn === p.value ? 'text-primary' : 'text-foreground')}>
                <span>{p.label}</span>
                {expiresIn === p.value && <span className="text-primary text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5">
          <p className="text-sm font-medium text-primary">Drop to share</p>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-muted border-l-2 border-primary">
          <CornerUpLeft size={13} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-primary mb-0.5">{replyTo.sender.name}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button onClick={onClearReply} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Expiry indicator */}
      {expiresIn && (
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Timer size={12} className="text-primary" />
          <span className="text-xs text-primary">Disappears in {EXPIRY_PRESETS.find(p => p.value === expiresIn)?.label}</span>
          <button onClick={() => setExpiresIn(undefined)} className="text-muted-foreground hover:text-foreground ml-1"><X size={12} /></button>
        </div>
      )}

      {/* Input row */}
      <div {...getRootProps()} className={clsx(
        'flex items-end gap-1.5 rounded-xl border bg-input-background transition-colors',
        'focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20',
        'border-border px-2 py-2'
      )}>
        <input {...getInputProps()} style={{ display: 'none' }} />

        {/* Attach */}
        <IconButton size="sm" className="flex-shrink-0 mb-0.5" disabled={isUploading}
          onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*,video/*,application/pdf'; i.onchange = e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); }; i.click(); }}>
          <Paperclip size={17} />
        </IconButton>

        {/* Stickers */}
        <IconButton size="sm" className="flex-shrink-0 mb-0.5" onClick={() => { setShowStickers(v => !v); setShowEmoji(false); }}>
          <Sticker size={17} />
        </IconButton>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={isUploading ? 'Uploading...' : replyTo ? `Replying to ${replyTo.sender.name}…` : 'Message… (@mention, Shift+Enter for new line)'}
          rows={1}
          disabled={isUploading}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[34px] max-h-[120px] py-1 leading-6 scrollbar-thin"
          style={{ overflowY: 'auto' }}
        />

        {/* Expiry */}
        <IconButton size="sm" className={clsx('flex-shrink-0 mb-0.5', expiresIn && 'text-primary')} onClick={() => setShowExpiryMenu(v => !v)}>
          <Timer size={17} />
        </IconButton>

        {/* Emoji */}
        <IconButton size="sm" className="flex-shrink-0 mb-0.5" onClick={() => { setShowEmoji(v => !v); setShowStickers(false); }}>
          <Smile size={17} />
        </IconButton>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!hasContent || isUploading}
          className={clsx(
            'flex-shrink-0 mb-0.5 h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150',
            hasContent
              ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
              : 'text-muted-foreground cursor-not-allowed'
          )}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
