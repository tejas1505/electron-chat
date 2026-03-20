import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '@/services/api';
import clsx from 'clsx';

interface Preview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface Props { url: string; isOwn: boolean; }

export function LinkPreview({ url, isOwn }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.post('/api/messages/link-preview', { url })
      .then(({ data }) => { if (!cancelled) setPreview(data.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  if (loading || !preview || (!preview.title && !preview.description && !preview.image)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'block mt-2 rounded-xl overflow-hidden border max-w-xs no-underline',
        'hover:opacity-90 transition-opacity',
        isOwn
          ? 'border-white/15 bg-white/10'
          : 'border-border bg-card'
      )}
    >
      {preview.image && (
        <div className="h-32 overflow-hidden bg-muted">
          <img
            src={preview.image}
            alt={preview.title ?? ''}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1">
          {preview.favicon && (
            <img src={preview.favicon} alt="" width={12} height={12} className="rounded-sm flex-shrink-0" />
          )}
          <span className={clsx(
            'text-[10px] uppercase tracking-wider font-medium',
            isOwn ? 'text-white/50' : 'text-muted-foreground'
          )}>
            {preview.siteName}
          </span>
          <ExternalLink size={9} className={isOwn ? 'text-white/30' : 'text-muted-foreground'} />
        </div>
        {preview.title && (
          <p className={clsx(
            'text-xs font-semibold line-clamp-2 mb-0.5',
            isOwn ? 'text-white' : 'text-foreground'
          )}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={clsx(
            'text-[11px] line-clamp-2',
            isOwn ? 'text-white/60' : 'text-muted-foreground'
          )}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
