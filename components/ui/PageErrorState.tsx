'use client';

import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

type PageErrorStateProps = {
    title: string;
    description: string;
    actionHref?: string;
    actionLabel?: string;
    onRetryAction?: () => void;
    retryLabel?: string;
    icon?: ReactNode;
};

export function PageErrorState({ title, description, actionHref, actionLabel, onRetryAction, retryLabel, icon }: PageErrorStateProps) {
    const t = useTranslations('PageErrorState');

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-white shadow-[0_18px_45px_rgba(36,31,26,0.16)]">
                {icon ?? <AlertTriangle className="h-7 w-7" />}
            </div>
            <h1 className="mb-3 max-w-md text-balance text-2xl font-bold text-ink lg:text-3xl">{title}</h1>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                {onRetryAction && (
                    <button
                        type="button"
                        onClick={onRetryAction}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {retryLabel ?? t('retry')}
                    </button>
                )}
                {actionHref && actionLabel && (
                    <Link
                        href={actionHref}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {actionLabel}
                    </Link>
                )}
            </div>
        </main>
    );
}
