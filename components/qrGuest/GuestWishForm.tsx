'use client';

import { BookHeart, Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IncidentPausedNote } from '@/components/incident/IncidentPausedNote';
import { SignupAcceptanceCheckbox } from '@/components/legal/SignupAcceptanceCheckbox';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { GUEST_WISH_NAME_MAX_LENGTH, useGuestWishForm } from '@/hooks/useGuestWishForm';

interface GuestWishFormProps {
    token: string;
}

export function GuestWishForm({ token }: GuestWishFormProps) {
    const t = useTranslations('QrCodePage');
    const form = useGuestWishForm(token);

    if (form.sent) {
        return (
            /* Sent */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
                <BookHeart className="h-9 w-9 text-pink-500" />
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
        <form onSubmit={form.submit} className="flex flex-col gap-4">
            {/* Name */}
            <div>
                <FormFieldLabel label={t('guestCode.wish.nameLabel')} required>
                    <input
                        type="text"
                        maxLength={GUEST_WISH_NAME_MAX_LENGTH}
                        value={form.guestName}
                        onChange={form.changeGuestName}
                        className="w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-primary/30"
                    />
                </FormFieldLabel>
                {form.fieldErrors.guestName && <p className="mt-1 text-xs text-red-500">{form.fieldErrors.guestName}</p>}
            </div>

            {/* Message */}
            <div>
                <FormFieldLabel label={t('guestCode.wish.messageLabel')} required>
                    <textarea
                        maxLength={form.maxMessageLength}
                        rows={6}
                        value={form.message}
                        onChange={form.changeMessage}
                        disabled={form.isPending}
                        className="min-h-40 w-full resize-none rounded-[1.5rem] border border-border/70 bg-background px-5 py-4 text-base leading-8 text-ink transition-shadow outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                </FormFieldLabel>
                {form.fieldErrors.message && <p className="mt-1 text-xs text-red-500">{form.fieldErrors.message}</p>}
                <p className="mt-1 text-xs text-ink-faint">
                    {t('guestCode.wish.charactersLeft', { current: form.message.length, max: form.maxMessageLength })}
                </p>
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
                className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
