'use client';

import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { routes } from '@/lib/routes';

export function PlaylistDisabledState({ backLabel, body, eventId, title }: { backLabel: string; body: string; eventId: string; title: string }) {
    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <div className="flex items-center gap-3 py-4">
                <Link
                    href={routes.post.feed(eventId)}
                    aria-label={backLabel}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </div>

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
        </div>
    );
}
