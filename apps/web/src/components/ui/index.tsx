import React from 'react';
import { clsx } from 'clsx';

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', loading, className, children, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';
  const variants = {
    primary:     'bg-primary text-primary-foreground hover:opacity-90 active:scale-95',
    secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost:       'text-foreground hover:bg-muted active:bg-muted/80',
    outline:     'border border-border text-foreground hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  };
  const sizes = {
    xs: 'h-7 px-2.5 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
  };
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  );
}

// ── IconButton ────────────────────────────────────────────────
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'xs' | 'sm' | 'md';
  variant?: 'ghost' | 'filled';
  active?: boolean;
}

export function IconButton({
  size = 'sm', variant = 'ghost', active, className, children, ...props
}: IconButtonProps) {
  const sizes = { xs: 'h-6 w-6', sm: 'h-8 w-8', md: 'h-9 w-9' };
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50',
        variant === 'ghost'
          ? 'text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95'
          : 'bg-primary text-primary-foreground hover:opacity-90',
        active && 'text-primary bg-primary/10',
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={clsx(
          'w-full h-9 px-3 text-sm rounded-lg border border-border bg-input-background text-foreground',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary',
          'transition-colors duration-150 disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive/30',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ── Textarea ──────────────────────────────────────────────────
export const Textarea = React.forwardRef<
  HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      'w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background text-foreground',
      'placeholder:text-muted-foreground resize-none',
      'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary',
      'transition-colors duration-150 scrollbar-thin',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

// ── Avatar ────────────────────────────────────────────────────
interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  online?: boolean;
  className?: string;
}

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const sizes = {
    xs:  'h-5 w-5 text-[9px]',
    sm:  'h-8 w-8 text-xs',
    md:  'h-9 w-9 text-sm',
    lg:  'h-10 w-10 text-sm',
    xl:  'h-14 w-14 text-lg',
    '2xl': 'h-20 w-20 text-2xl',
  };
  const dotSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2.5 w-2.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-3.5 w-3.5',
    '2xl': 'h-4 w-4',
  };
  const initials = name ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?';

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      <div className={clsx(
        'rounded-full overflow-hidden flex items-center justify-center font-medium',
        'bg-primary/20 text-primary border border-border/50',
        sizes[size]
      )}>
        {src ? (
          <img src={src} alt={name ?? ''} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online && (
        <span className={clsx(
          'absolute bottom-0 right-0 rounded-full bg-online border-2 border-sidebar',
          dotSizes[size]
        )} />
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full',
      'bg-primary text-primary-foreground text-[10px] font-semibold',
      className
    )}>
      {children}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg className={clsx('animate-spin text-primary', sizes[size], className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

// ── Separator ─────────────────────────────────────────────────
export function Separator({ className }: { className?: string }) {
  return <div className={clsx('h-px bg-border', className)} />;
}

// ── Tooltip ───────────────────────────────────────────────────
export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-md bg-popover text-popover-foreground border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {label}
      </div>
    </div>
  );
}

// ── ProtectedRoute ────────────────────────────────────────────
export { default as ProtectedRoute } from './ProtectedRoute';
