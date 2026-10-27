'use client';

import { useTranslations } from 'next-intl';

import { RsvpHeader } from '@/components/rsvp/RsvpHeader';

// Vendors don't RSVP, so they get one line instead of the form.
export function RsvpVendorNotice({ backHref }: { backHref: string }) {
    const t = useTranslations('ApiErrors');

    return (
        <div className="mx-auto max-w-2xl px-4 pb-8">
            {/* Header */}
            <RsvpHeader backHref={backHref} />
            {/* Notice */}
            <p className="mt-6 text-sm text-ink-muted">{t('vendorCannotRsvp')}</p>
        </div>
    );
}
