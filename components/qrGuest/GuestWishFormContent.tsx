'use client';

import { Loader2, Send, Signature } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { SignupAcceptanceCheckbox } from '@/components/legal/SignupAcceptanceCheckbox';
import { QrSentArt } from '@/components/qrGuest/QrSentArt';
import { WishLengthCount } from '@/components/qrGuest/WishLengthCount';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { VoiceRecorder } from '@/components/wishbook/VoiceRecorder';
import { GUEST_WISH_NAME_MAX_LENGTH, type GuestWishFormState } from '@/hooks/useGuestWishForm';

// Field labels in plain sentence case, a step stronger than the app's small caps, so the two boxes read clearly.
const FIELD_LABEL_CLASS = 'text-sm font-semibold tracking-normal text-ink normal-case';

// The wish form on a guest code, drawn from the form's state: a written wish, a recorded one, or both.
export function GuestWishFormContent({ form }: { form: GuestWishFormState }) {
    const t = useTranslations('QrCodePage');

    if (form.sent) {
        return (
            /* Sent */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
                <QrSentArt kind="wish" />
                <p className="text-base font-semibold text-ink">{t('guestCode.wish.sent')}</p>
                <button
                    type="button"
                    onClick={form.writeAnother}
                    className="inline-flex min-h-10 items-center rounded-full bg-surface-muted px-5 text-sm font-semibold text-ink transition-opacity hover:opacity-80"
                >
                    {t('guestCode.wish.writeAnother')}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={form.submit} className="flex flex-col gap-5">
            {/* Message */}
            <div>
                <FormFieldLabel label={t('guestCode.wish.messageLabel')} required={form.messageRequired} labelClassName={FIELD_LABEL_CLASS}>
                    <textarea
                        maxLength={form.maxMessageLength}
                        rows={5}
                        value={form.message}
                        onChange={form.changeMessage}
                        disabled={form.isPending}
                        className="min-h-32 w-full resize-none rounded-[1rem] border border-border bg-background px-4 py-3 text-base leading-7 text-ink transition-shadow outline-none focus:border-primary/40 focus:ring-3 focus:ring-primary/15 disabled:opacity-60"
                    />
                </FormFieldLabel>
                {form.fieldErrors.message && <p className="mt-1 text-xs text-red-500">{form.fieldErrors.message}</p>}
                <WishLengthCount current={form.message.length} max={form.maxMessageLength} />
            </div>

            {/* Recording */}
            <div className="px-1 py-2">
                <VoiceRecorder recorder={form.recorder} disabled={form.isPending} />
            </div>

            {/* Name: a line above it keeps it apart from the recording */}
            <div className="border-t border-border/60 pt-5">
                <FormFieldLabel label={t('guestCode.wish.nameLabel')} required labelClassName={FIELD_LABEL_CLASS}>
                    <span className="flex items-center gap-2.5 rounded-[1rem] border border-border bg-background px-4 transition-shadow focus-within:border-primary/40 focus-within:ring-3 focus-within:ring-primary/15">
                        <Signature className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <input
                            type="text"
                            maxLength={GUEST_WISH_NAME_MAX_LENGTH}
                            value={form.guestName}
                            onChange={form.changeGuestName}
                            className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none"
                        />
                    </span>
                </FormFieldLabel>
                {form.fieldErrors.guestName && <p className="mt-1 text-xs text-red-500">{form.fieldErrors.guestName}</p>}
            </div>

            {/* Incident note */}
            <IncidentPausedNote />

            {/* Acceptance */}
            <SignupAcceptanceCheckbox minimumAge={16} checked={form.acceptedDocuments} onChangeAction={form.changeAccepted} />

            {/* Status */}
            {form.submitError && (
                <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                    {form.submitError}
                </p>
            )}

            {/* Send */}
            <button
                type="submit"
                disabled={!form.canSubmit}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {form.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        {t('guestCode.wish.submit')}
                        <Send className="h-4 w-4" />
                    </>
                )}
            </button>
        </form>
    );
}
