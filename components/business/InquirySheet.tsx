'use client';

import { Mail, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useBusinessContactFocus } from '@/hooks/useBusinessContactFocus';
import type { GuestInquiryDto } from '@/lib/api/types';
import { formatInquiryDate } from '@/lib/inquiries';

// A call or email link, styled like the call and email buttons on vendor cards. Long addresses shorten instead of
// widening the sheet.
const REPLY_LINK = buttonVariants({
    variant: 'ghost',
    className: 'h-9 max-w-full gap-1.5 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink hover:bg-surface-muted/70',
});

// One inquiry: the date and event, ways to answer the guest, their note, and the partner's own done mark.
export function InquirySheet({
    inquiry,
    isSaving,
    error,
    onSetDoneAction,
    onCloseAction,
}: {
    inquiry: GuestInquiryDto;
    isSaving: boolean;
    error: string | null;
    onSetDoneAction: (done: boolean) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('BusinessPage.inquiries');
    const locale = useLocale();
    const done = inquiry.status === 'DONE';
    // The same focus move as "Write to us": onto the error after a failed save, so it is read out.
    const { errorRef } = useBusinessContactFocus(false, error);
    const handleToggle = useCallback(() => onSetDoneAction(!done), [onSetDoneAction, done]);

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={inquiry.guestName} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="truncate pr-8 text-base font-bold text-ink">{inquiry.guestName}</h2>

                <div className="mt-4 flex flex-col gap-4">
                    {/* Details */}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-ink-muted">{t('date')}</dt>
                        <dd className="text-ink">{formatInquiryDate(locale, inquiry.eventDate)}</dd>
                        <dt className="text-ink-muted">{t('event')}</dt>
                        <dd className="min-w-0 truncate text-ink">{inquiry.eventTitle}</dd>
                    </dl>

                    {/* Note */}
                    {inquiry.note && (
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-ink-muted">{t('note')}</p>
                            <p className="text-sm break-words whitespace-pre-line text-ink">{inquiry.note}</p>
                        </div>
                    )}

                    {/* Reply */}
                    {(inquiry.phone || inquiry.email) && (
                        <div className="flex flex-wrap gap-2">
                            {inquiry.phone && (
                                <a href={`tel:${inquiry.phone.replace(/[^+\d]/g, '')}`} className={REPLY_LINK}>
                                    <Phone aria-hidden="true" />
                                    <span className="truncate">
                                        {t('call')} {inquiry.phone}
                                    </span>
                                </a>
                            )}
                            {inquiry.email && (
                                <a href={`mailto:${encodeURIComponent(inquiry.email)}`} className={REPLY_LINK}>
                                    <Mail aria-hidden="true" />
                                    <span className="truncate">
                                        {t('writeEmail')} {inquiry.email}
                                    </span>
                                </a>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm text-status-danger outline-none">
                            {error}
                        </p>
                    )}

                    {/* Footer */}
                    <Button type="button" size="lg" variant={done ? 'outline' : 'default'} disabled={isSaving} onClick={handleToggle}>
                        {done ? t('markNew') : t('markDone')}
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
}
