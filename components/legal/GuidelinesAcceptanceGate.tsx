'use client';

import { Loader2, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { AuthLoadingState } from '@/components/layout/AuthLoadingState';
import { useAcceptGuidelines } from '@/hooks/useAcceptGuidelines';
import { useMe } from '@/hooks/useMe';
import { isGuidelinesVersionMismatchError } from '@/lib/api/errors';
import { routes } from '@/lib/routes';

// Blocks the signed-in app until the Community Guidelines in force are accepted.
// The backend refuses writes (4013) regardless; this is the screen that lets the
// user fix it. If /api/me fails, the app renders: the backend still enforces.
export function GuidelinesAcceptanceGate({ children }: { children: ReactNode }) {
    const t = useTranslations('GuidelinesGate');
    const { data: me, isLoading } = useMe();
    const accept = useAcceptGuidelines();
    const version = me?.currentGuidelinesVersion ?? null;
    const { mutate } = accept;

    const handleAccept = useCallback(() => {
        if (version) mutate(version);
    }, [mutate, version]);

    // useMe is disabled while signed out, and a disabled query never reports isLoading.
    if (isLoading && !me) return <AuthLoadingState />;
    if (!me?.guidelinesAcceptanceRequired || !version) return <>{children}</>;

    const errorMessage = accept.error ? (isGuidelinesVersionMismatchError(accept.error) ? t('changed') : t('failed')) : null;

    return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
            <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-6">
                {/* Heading */}
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ScrollText className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-ink">{t('title')}</h1>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('body')}</p>
                    </div>
                </div>

                {/* Read */}
                <Link href={routes.legal.communityGuidelines()} target="_blank" rel="noopener" className="text-sm font-semibold text-ink underline">
                    {t('read')}
                </Link>

                {errorMessage && (
                    <p role="alert" className="text-xs text-destructive">
                        {errorMessage}
                    </p>
                )}

                {/* Accept */}
                <button
                    type="button"
                    onClick={handleAccept}
                    disabled={accept.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    {accept.isPending ? t('accepting') : t('accept')}
                </button>
            </div>
        </main>
    );
}
