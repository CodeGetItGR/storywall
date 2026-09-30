'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { GiftClaim } from '@/hooks/useGiftClaim';
import { GIFT_PIN_LENGTH } from '@/lib/gift';

const primaryClass =
    'flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';

// Sign in, then claim, with the card's PIN when the account isn't the recipient's.
export function GiftClaimForm({ claim }: { claim: GiftClaim }) {
    const t = useTranslations('GiftMode.claim');

    if (!claim.isAuthenticated) {
        return (
            <div className="flex flex-col gap-3">
                {/* Sign in */}
                <Link href={claim.loginHref} className={primaryClass}>
                    {t('signIn')}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                    href={claim.registerHref}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-muted py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                >
                    {t('register')}
                </Link>
            </div>
        );
    }

    if (claim.accountIssue) {
        // Account can't claim
        return <p className="text-sm text-ink-muted">{t(claim.accountIssue)}</p>;
    }

    return (
        <form className="flex flex-col gap-4" onSubmit={claim.submit}>
            {/* PIN */}
            {claim.showPin && (
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('pinLabel')}</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={GIFT_PIN_LENGTH}
                        value={claim.pin}
                        onChange={claim.handlePinChange}
                        disabled={claim.isClaiming}
                        className="rounded-xl bg-surface-muted px-4 py-3 text-center font-mono text-xl tracking-[0.4em] text-ink outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {claim.attemptsLeft !== null && (
                        <span className="text-xs text-ink-muted">{t('attemptsLeft', { count: claim.attemptsLeft })}</span>
                    )}
                </label>
            )}

            {claim.error && (
                <p role="alert" className="text-sm text-rose-600">
                    {claim.error}
                </p>
            )}

            {/* Claim */}
            <button type="submit" disabled={!claim.canSubmit} className={primaryClass}>
                {claim.isClaiming ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('claim')}
            </button>
        </form>
    );
}
