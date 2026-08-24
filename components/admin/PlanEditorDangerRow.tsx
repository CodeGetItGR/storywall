import type { ReactNode } from 'react';

export function PlanEditorDangerRow({ title, body, children }: { title: string; body: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 border-t border-status-danger-wash py-4 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 sm:max-w-lg">
                <p className="text-sm font-bold text-status-danger">{title}</p>
                <p className="mt-1 text-xs leading-5 text-status-danger/70">{body}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}
