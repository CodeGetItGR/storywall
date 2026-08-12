import type { ComponentType, ReactNode } from 'react';

interface AddSongFieldShellProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    children: ReactNode;
}

export function AddSongFieldShell({ icon: Icon, label, children }: AddSongFieldShellProps) {
    return (
        <label className="group block">
            <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
            </span>
            {children}
        </label>
    );
}
