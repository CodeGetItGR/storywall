'use client';

import { Gift } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Logo } from '@/components/common/Logo';
import type { GiftClaimResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

// After a claim: the event is theirs now, or they are a host until ownership moves.
export function GiftClaimOutcome({ outcome, eventTitle }: { outcome: GiftClaimResponseDto; eventTitle: string }) {
    const t = useTranslations('GiftMode.claim.outcome');
    const locale = useLocale();
    const body =
        outcome.status === 'COMPLETED'
            ? t('completed', { title: eventTitle })
            : outcome.ownershipTransfersAt
              ? t('claimed', { date: formatDate(locale, outcome.ownershipTransfersAt, { dateStyle: 'long' }) })
              : t('claimedSoon');

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
            <Logo direction="col" className="mb-8" />
            {/* Result */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand">
                <Gift className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-balance text-ink lg:text-3xl">{t('title')}</h1>
            <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>

            {/* Next */}
            <Link
                href={routes.home}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
            >
                {t('open')}
            </Link>
        </div>
    );
}
