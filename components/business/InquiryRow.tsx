'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { GuestInquiryDto } from '@/lib/api/types';
import { formatInquiryDate } from '@/lib/inquiries';

// One inquiry: who asked, the date they asked about and from which event, and New until the partner marks it done.
// Same height, type and open marker as an event row, so the two lists read alike.
export function InquiryRow({ inquiry, onOpenAction }: { inquiry: GuestInquiryDto; onOpenAction: (id: string) => void }) {
    const t = useTranslations('BusinessPage.inquiries');
    const locale = useLocale();
    const handleClick = useCallback(() => onOpenAction(inquiry.id), [onOpenAction, inquiry.id]);

    return (
        <li>
            <button type="button" onClick={handleClick} className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-ring">
                {/* Guest and date */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{inquiry.guestName}</p>
                    <p className="truncate text-xs leading-snug text-ink-muted">
                        {formatInquiryDate(locale, inquiry.eventDate)} · {inquiry.eventTitle}
                    </p>
                </div>

                {/* Status */}
                {inquiry.status === 'NEW' && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-dark">{t('new')}</span>
                )}

                {/* Open marker */}
                <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
        </li>
    );
}
