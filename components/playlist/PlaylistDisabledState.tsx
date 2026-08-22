'use client';

import { AlertCircle, Music } from 'lucide-react';

import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { routes } from '@/lib/routes';

export function PlaylistDisabledState({ backLabel, body, eventId, title }: { backLabel: string; body: string; eventId: string; title: string }) {
    return (
        <ModulePageShell
            maxWidth="2xl"
            title={title}
            icon={Music}
            iconClassName="text-violet-500"
            showTitleIcon={false}
            backLabel={backLabel}
            backHref={routes.post.feed(eventId)}
        >
            <div className="mt-8 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ink">{title}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                    </div>
                </div>
            </div>
        </ModulePageShell>
    );
}
