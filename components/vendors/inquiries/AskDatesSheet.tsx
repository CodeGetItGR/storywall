'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { InquirySentArt } from '@/components/vendors/inquiries/InquirySentArt';
import { useBusinessContactFocus } from '@/hooks/useBusinessContactFocus';
import { INQUIRY_NOTE_MAX } from '@/lib/inquiries';

const FIELD = 'min-h-11 rounded-lg border border-border bg-background px-3';

// "Ask about my date": the date, a way to reach the guest, a note and their consent, then a short confirmation.
// It can't be dismissed while sending.
export function AskDatesSheet({
    name,
    date,
    phone,
    email,
    note,
    consent,
    dateBounds,
    dateError,
    contactError,
    sendError,
    sent,
    isSending,
    canSend,
    onDateChangeAction,
    onPhoneChangeAction,
    onEmailChangeAction,
    onNoteChangeAction,
    onConsentChangeAction,
    onSubmitAction,
    onCloseAction,
}: {
    name: string;
    date: string;
    phone: string;
    email: string;
    note: string;
    consent: boolean;
    dateBounds: { min: string; max: string };
    dateError: string | null;
    contactError: string | null;
    sendError: string | null;
    sent: boolean;
    isSending: boolean;
    canSend: boolean;
    onDateChangeAction: (value: string) => void;
    onPhoneChangeAction: (value: string) => void;
    onEmailChangeAction: (value: string) => void;
    onNoteChangeAction: (value: string) => void;
    onConsentChangeAction: (value: boolean) => void;
    onSubmitAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.inquiry');
    const dateErrorId = useId();
    const contactErrorId = useId();
    // The same focus moves as "Write to us": onto the confirmation once sent, onto the error after a failed send.
    const { sentRef, errorRef } = useBusinessContactFocus(sent, sendError);

    function onDate(event: ChangeEvent<HTMLInputElement>) {
        onDateChangeAction(event.target.value);
    }
    function onPhone(event: ChangeEvent<HTMLInputElement>) {
        onPhoneChangeAction(event.target.value);
    }
    function onEmail(event: ChangeEvent<HTMLInputElement>) {
        onEmailChangeAction(event.target.value);
    }
    function onNote(event: ChangeEvent<HTMLTextAreaElement>) {
        onNoteChangeAction(event.target.value);
    }
    function onConsent(event: ChangeEvent<HTMLInputElement>) {
        onConsentChangeAction(event.target.checked);
    }
    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        onSubmitAction();
    }

    return (
        <Modal
            open
            onClose={onCloseAction}
            variant="sheet"
            size="sm"
            closeDisabled={isSending}
            ariaLabel={t('sheetTitle', { name })}
            closeLabel={t('close')}
        >
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle', { name })}</h2>

                {sent ? (
                    /* Sent */
                    <div className="mt-4 flex flex-col gap-4">
                        <InquirySentArt />
                        <p ref={sentRef} role="status" tabIndex={-1} className="text-center text-sm text-ink outline-none">
                            {t('sent', { name })}
                        </p>
                        <Button type="button" size="lg" onClick={onCloseAction}>
                            {t('close')}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
                        {/* Date */}
                        <div className="flex flex-col gap-1">
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('date')}
                                <input
                                    type="date"
                                    value={date}
                                    min={dateBounds.min}
                                    max={dateBounds.max}
                                    onChange={onDate}
                                    aria-invalid={dateError ? true : undefined}
                                    aria-describedby={dateError ? dateErrorId : undefined}
                                    className={FIELD}
                                />
                            </label>
                            {dateError && (
                                <p id={dateErrorId} role="alert" className="text-xs text-status-danger">
                                    {dateError}
                                </p>
                            )}
                        </div>

                        {/* Contact */}
                        <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('phone')}
                                <input
                                    type="tel"
                                    autoComplete="tel"
                                    value={phone}
                                    onChange={onPhone}
                                    maxLength={40}
                                    aria-invalid={contactError ? true : undefined}
                                    aria-describedby={contactError ? contactErrorId : undefined}
                                    className={FIELD}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('email')}
                                <input
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={onEmail}
                                    maxLength={254}
                                    aria-invalid={contactError ? true : undefined}
                                    aria-describedby={contactError ? contactErrorId : undefined}
                                    className={FIELD}
                                />
                            </label>
                            {contactError && (
                                <p id={contactErrorId} role="alert" className="text-xs text-status-danger">
                                    {contactError}
                                </p>
                            )}
                        </div>

                        {/* Note */}
                        <label className="flex flex-col gap-1 text-sm text-ink">
                            {t('note')}
                            <textarea
                                value={note}
                                onChange={onNote}
                                maxLength={INQUIRY_NOTE_MAX}
                                rows={3}
                                className="rounded-lg border border-border bg-background px-3 py-2"
                            />
                        </label>

                        {/* Consent */}
                        <label className="flex items-start gap-3 text-sm text-ink">
                            <input
                                type="checkbox"
                                checked={consent}
                                onChange={onConsent}
                                className="mt-0.5 size-5 shrink-0 accent-primary focus-ring"
                            />
                            <span>{t('consent', { name })}</span>
                        </label>

                        {/* Send error */}
                        {sendError && (
                            <p ref={errorRef} role="alert" tabIndex={-1} className="text-sm text-status-danger outline-none">
                                {sendError}
                            </p>
                        )}

                        {/* Footer */}
                        <Button type="submit" size="lg" disabled={!canSend}>
                            {isSending ? t('sending') : t('send')}
                        </Button>
                    </form>
                )}
            </Modal.Body>
        </Modal>
    );
}
