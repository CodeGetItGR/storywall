'use client';

import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateEventInvitation } from '@/hooks/useEventInvitations';
import { getFieldErrors } from '@/lib/api/errors';
import type { EventInvitationRequestDto } from '@/lib/api/types';
import { generateInviteCode } from '@/lib/eventInvitations';
import { cn } from '@/lib/utils';

import { fieldControlClass, fieldLabelClass, fieldTextClass, formPanelClass } from './shared';

export function CreateInvitationForm({
    eventId,
    onDoneAction,
    onClampNoticeAction,
}: {
    eventId: string;
    onDoneAction: () => void;
    onClampNoticeAction?: (message: string) => void;
}) {
    const t = useTranslations('ManagePage');
    const tCommon = useTranslations('Common');
    const createInvitation = useCreateEventInvitation();
    const [maxGuests, setMaxGuests] = useState(1);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [allowPlusOnes, setAllowPlusOnes] = useState(false);

    const fieldErrors = getFieldErrors(createInvitation.error);
    const toErrorMessage = useApiErrorMessage();
    const formError = fieldErrors?.inviteCode ?? (!fieldErrors ? toErrorMessage(createInvitation.error) : null);

    function handleMaxGuestsChange(event: ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.max(1, Number(event.target.value)));
    }

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        setFirstName(event.target.value);
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLastName(event.target.value);
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.target.value);
    }

    function handleAllowPlusOnesChange(event: ChangeEvent<HTMLInputElement>) {
        const checked = event.target.checked;
        setAllowPlusOnes(checked);
        if (!checked) {
            setMaxGuests(1);
        }
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const inviteCode = generateInviteCode();
        const requestedMaxGuests = allowPlusOnes ? maxGuests : 1;
        const input: EventInvitationRequestDto = {
            eventId,
            inviteCode,
            maxGuests: requestedMaxGuests,
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            email: email.trim() || undefined,
        };
        try {
            const invitation = await createInvitation.mutateAsync(input);
            if (invitation.maxGuests !== requestedMaxGuests) {
                onClampNoticeAction?.(t('invitations.cappedToPlan', { count: invitation.maxGuests }));
            }
            onDoneAction();
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className={formPanelClass}>
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{t('invitations.create.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('invitations.create.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={onDoneAction}
                    aria-label={t('invitations.create.cancel')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Guest */}
            <div>
                <p className="mb-3 text-xs font-semibold text-ink">{t('invitations.create.guestTitle')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormFieldLabel label={t('invitations.fields.firstName')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                        <input type="text" value={firstName} onChange={handleFirstNameChange} className={fieldControlClass} />
                    </FormFieldLabel>
                    <FormFieldLabel label={t('invitations.fields.lastName')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                        <input type="text" value={lastName} onChange={handleLastNameChange} className={fieldControlClass} />
                    </FormFieldLabel>
                </div>

                <FormFieldLabel
                    label={t('invitations.fields.email')}
                    optional
                    className={cn(fieldLabelClass, 'mt-3')}
                    labelClassName={fieldTextClass}
                >
                    <input type="email" value={email} onChange={handleEmailChange} className={fieldControlClass} />
                    {fieldErrors?.email && <span className="text-xs text-rose-500">{fieldErrors.email}</span>}
                    <span className="text-xs leading-relaxed text-ink-muted">{t('invitations.create.emailHint')}</span>
                </FormFieldLabel>
            </div>

            {/* Plus ones */}
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-3">
                <input
                    type="checkbox"
                    checked={allowPlusOnes}
                    onChange={handleAllowPlusOnesChange}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                        {t('invitations.create.allowPlusOnes')} <span className="text-ink-faint">({tCommon('optional')})</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{t('invitations.create.allowPlusOnesHint')}</span>
                </span>
            </label>

            {allowPlusOnes && (
                <div className="mt-3">
                    <FormFieldLabel label={t('invitations.fields.maxGuests')} required className={fieldLabelClass} labelClassName={fieldTextClass}>
                        <input
                            type="number"
                            required
                            min={1}
                            value={maxGuests}
                            onChange={handleMaxGuestsChange}
                            className={cn(fieldControlClass, 'sm:max-w-48')}
                        />
                    </FormFieldLabel>
                </div>
            )}

            {/* Actions */}
            {createInvitation.isError && formError && <p className="mt-3 text-xs text-rose-500">{formError}</p>}

            <button
                type="submit"
                disabled={createInvitation.isPending}
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 px-4"
            >
                {createInvitation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('invitations.create.submit')}
            </button>
        </form>
    );
}
