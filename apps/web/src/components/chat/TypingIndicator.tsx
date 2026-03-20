export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-1">
      <div className="flex items-center gap-1 bg-secondary border border-border/50 rounded-2xl rounded-bl-sm px-3 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground dot-1" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground dot-2" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground dot-3" />
      </div>
    </div>
  );
}
