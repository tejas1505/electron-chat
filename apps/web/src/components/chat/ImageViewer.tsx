import { useEffect } from 'react';
import { X, Download, ZoomOut } from 'lucide-react';

interface Props { src: string; alt?: string; onClose: () => void; }

export function ImageViewer({ src, alt, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <a
          href={src}
          download={alt ?? 'image'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <Download size={16} />
        </a>
        <button
          onClick={onClose}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Image */}
      <div className="max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt={alt ?? 'Image'}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        />
        {alt && (
          <p className="text-white/50 text-xs text-center mt-3">{alt}</p>
        )}
      </div>

      <p className="absolute bottom-4 text-white/30 text-xs">Press Esc or click outside to close</p>
    </div>
  );
}
