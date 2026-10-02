interface AppFooterProps {
  text: string;
}

export function AppFooter({ text }: AppFooterProps) {
  return (
    <div className="h-9 shrink-0 border-t border-border flex items-center px-4 bg-card">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
