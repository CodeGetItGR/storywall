import type { ReactNode } from 'react';

// The avatar + name block: a button when the host can edit this member's role.
export function MemberIdentity({ onClick, label, children }: { onClick?: () => void; label: string; children: ReactNode }) {
    if (!onClick) return <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-colors hover:bg-surface-muted/60"
        >
            {children}
        </button>
    );
}
