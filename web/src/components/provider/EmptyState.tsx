import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state flex flex-col items-center justify-center text-center p-12 border border-dashed border-border bg-card/50 text-card-foreground animate-fade-up">
      <div className="empty-state-icon mb-4 text-muted-foreground [&>svg]:h-12 [&>svg]:w-12">
        {icon}
      </div>
      <h3 className="empty-state-title text-lg font-semibold tracking-tight text-foreground mb-1.5">
        {title}
      </h3>
      <p className="empty-state-description text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
