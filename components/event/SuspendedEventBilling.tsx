'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import BillingTab from '@/app/(main)/(app)/(event)/events/[eventId]/manage/BillingTab';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventDeleted } from '@/lib/eventLifecycle';

// The primary host's billing page while their StoryWall is suspended (spec 2026-10-02): the plan,
// the payments and the withdrawal actions, nothing else. The backend keeps exactly these reads open
// to the primary host (billing, usage, withdrawals); every purchase stays refused (4015).
export function SuspendedEventBilling({ event, backHref }: { event: EventDetailResponseDto; backHref: string }) {
    const t = useTranslations('SuspendedEvent');
    const headingRef = useRef<HTMLHeadingElement>(null);

    // Arriving from the suspended view's link: keyboard and screen-reader users start at the new heading.
    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    return (
        <section aria-labelledby="suspended-billing-title" className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
            <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t('billingBack')}
            </Link>

            {/* Heading */}
            <div className="space-y-1">
                <h1 ref={headingRef} tabIndex={-1} id="suspended-billing-title" className="text-2xl font-bold text-ink outline-none">
                    {t('billingTitle')}
                </h1>
                <p className="text-sm text-ink-muted">{event.title}</p>
            </div>

            {/* A closed StoryWall is soft-deleted: the tab then shows history only, as for any deleted event. */}
            <BillingTab eventId={event.id} schedule={event.schedule} canPurchase isDeleted={isEventDeleted(event)} withdrawalOnly />
        </section>
    );
}
