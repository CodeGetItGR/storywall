'use client';

import { Loader2, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useState } from 'react';

import { useAcceptGuidelines } from '@/hooks/useAcceptGuidelines';
import { useAuth } from '@/hooks/useAuth';
import { useGuidelinesAcceptanceBlocking } from '@/hooks/useGuidelinesAcceptanceBlocking';
import { useMe } from '@/hooks/useMe';
import { isGuidelinesVersionMismatchError } from '@/lib/api/errors';
import { routes } from '@/lib/routes';

// Mounted once in AppProviders around the page itself, inside ComposerProvider,
// so the publish queue (in memory only) survives the gate opening and closing.
// Signed out, useMe never runs and this renders children.
//
// Blocks the signed-in app once /api/me reports the Community Guidelines in force
// aren't accepted. Until then (loading, or /api/me failed) the app renders: holding
// every page load behind /api/me would cost every user a wait for a rare case, and
// the backend refuses writes (4013) regardless, which reopens this screen.
export function GuidelinesAcceptanceGate({ children }: { children: ReactNode }) {
    const t = useTranslations('GuidelinesGate');
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();
    const { data: me } = useMe();
    const isBlocking = useGuidelinesAcceptanceBlocking();
    const accept = useAcceptGuidelines();
    const version = me?.currentGuidelinesVersion ?? null;
    const { mutate } = accept;
    // The path sign-out started on. logout() clears /api/me at once, so without
    // this the hidden page would flash before the redirect lands.
    const [signingOutFrom, setSigningOutFrom] = useState<string | null>(null);
    if (signingOutFrom !== null && signingOutFrom !== pathname) setSigningOutFrom(null);
    const isSigningOut = signingOutFrom !== null;

    const handleAccept = useCallback(() => {
        if (version) mutate(version);
    }, [mutate, version]);

    // Wrong account, or not willing to accept: logout is exempt from 4013.
    const handleSignOut = useCallback(async () => {
        setSigningOutFrom(pathname);
        try {
            await logout();
        } finally {
            router.replace(routes.login);
        }
    }, [logout, pathname, router]);

    if (!isBlocking && !isSigningOut) return <>{children}</>;

    const errorMessage = accept.error ? (isGuidelinesVersionMismatchError(accept.error) ? t('changed') : t('failed')) : null;

    return (
        <main className="flex h-full overflow-y-auto bg-background px-4 py-16">
            <div className="m-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-6">
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
                    {t('read')} <span className="sr-only">{t('opensInNewTab')}</span>
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

                {/* Sign out */}
                <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="text-sm font-semibold text-ink-muted underline hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {t('signOut')}
                </button>
            </div>
        </main>
    );
}
