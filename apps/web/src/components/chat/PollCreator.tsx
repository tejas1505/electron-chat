import { useState } from 'react';
import { X, Plus, BarChart2, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/index';
import clsx from 'clsx';

interface Props { roomId: string; onClose: () => void; }

export function PollCreator({ roomId, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => { if (options.length < 8) setOptions(p => [...p, '']); };
  const updateOption = (i: number, v: string) => setOptions(p => p.map((o, idx) => idx === i ? v : o));
  const removeOption = (i: number) => { if (options.length > 2) setOptions(p => p.filter((_, idx) => idx !== i)); };

  const submit = async () => {
    const filled = options.filter(o => o.trim());
    if (!question.trim()) { setError('Question is required'); return; }
    if (filled.length < 2) { setError('At least 2 options required'); return; }
    setLoading(true);
    try {
      await api.post('/api/messages/poll', { roomId, question: question.trim(), options: filled });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create poll');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border border-border rounded-2xl p-5 w-80 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart2 size={14} className="text-primary" />
            </div>
            <p className="font-semibold text-sm text-foreground">Create a poll</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Question */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Question</label>
          <input
            autoFocus
            placeholder="Ask something…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
          />
        </div>

        {/* Options */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Options ({options.length}/8)
          </label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4 text-center flex-shrink-0">{i + 1}</span>
                <input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 8 && (
            <button
              onClick={addOption}
              className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <Plus size={13} />
              Add option
            </button>
          )}
        </div>

        {error && <p className="text-xs text-destructive mb-3">{error}</p>}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="sm" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" size="sm" loading={loading} onClick={submit}>
            Create poll
          </Button>
        </div>
      </div>
    </>
  );
}
