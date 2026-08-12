'use client';

import { Loader2, X } from 'lucide-react';
import React, { type ChangeEvent, useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateQrLink } from '@/hooks/useQrLinks';
import type { EventInvitationResponseDto, QrLinkRequestDto, QrTargetType } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { fieldControlClass, fieldLabelClass, fieldTextClass, formPanelClass, type ManageTranslations } from './shared';

export function CreateQrLinkForm({
    t,
    eventId,
    invitations,
    onDone,
}: {
    t: ManageTranslations;
    eventId: string;
    invitations: EventInvitationResponseDto[];
    onDone: () => void;
}) {
    const createQrLink = useCreateQrLink(eventId);
    const [targetType, setTargetType] = useState<QrTargetType>('EVENT_JOIN');
    const [label, setLabel] = useState('');
    const [maxGuests, setMaxGuests] = useState(50);
    const [targetId, setTargetId] = useState(invitations[0]?.id ?? '');
    const toErrorMessage = useApiErrorMessage();

    const isInvitationTarget = targetType === 'INVITATION';

    function handleTargetTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        setTargetType(event.target.value as QrTargetType);
    }

    function handleLabelChange(event: ChangeEvent<HTMLInputElement>) {
        setLabel(event.target.value);
    }

    function handleTargetIdChange(event: ChangeEvent<HTMLSelectElement>) {
        setTargetId(event.target.value);
    }

    function handleMaxGuestsChange(event: ChangeEvent<HTMLInputElement>) {
        setMaxGuests(Math.max(1, Number(event.target.value)));
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const input: QrLinkRequestDto = {
            targetType,
            label: label.trim() || undefined,
            ...(isInvitationTarget ? { targetId } : { maxGuests }),
        };

        try {
            await createQrLink.mutateAsync(input);
            onDone();
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className={formPanelClass}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-ink">{t('qr.create.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('qr.create.subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={onDone}
                    aria-label={t('invitations.create.cancel')}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <FormFieldLabel label={t('qr.fields.targetType')} className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <select value={targetType} onChange={handleTargetTypeChange} className={fieldControlClass}>
                        <option value="EVENT_JOIN">{t('qr.targetTypes.EVENT_JOIN')}</option>
                        <option value="MEDIA_UPLOAD">{t('qr.targetTypes.MEDIA_UPLOAD')}</option>
                        <option value="INVITATION">{t('qr.targetTypes.INVITATION')}</option>
                    </select>
                </FormFieldLabel>

                <FormFieldLabel label={t('qr.fields.label')} optional className={fieldLabelClass} labelClassName={fieldTextClass}>
                    <input
                        type="text"
                        maxLength={100}
                        value={label}
                        onChange={handleLabelChange}
                        placeholder={t('qr.placeholders.label')}
                        className={cn(fieldControlClass, 'placeholder:text-ink-faint')}
                    />
                </FormFieldLabel>
            </div>

            {isInvitationTarget ? (
                <FormFieldLabel label={t('qr.fields.invitation')} required className={cn(fieldLabelClass, 'mt-4')} labelClassName={fieldTextClass}>
                    <select required value={targetId} onChange={handleTargetIdChange} className={fieldControlClass}>
                        {invitations.map((invitation) => (
                            <option key={invitation.id} value={invitation.id}>
                                {invitation.inviteCode}
                            </option>
                        ))}
                    </select>
                </FormFieldLabel>
            ) : (
                <FormFieldLabel label={t('qr.fields.maxGuests')} required className={cn(fieldLabelClass, 'mt-4')} labelClassName={fieldTextClass}>
                    <input
                        type="number"
                        required
                        min={1}
                        max={1000}
                        value={maxGuests}
                        onChange={handleMaxGuestsChange}
                        className={fieldControlClass}
                    />
                </FormFieldLabel>
            )}

            {isInvitationTarget && invitations.length === 0 && <p className="mt-3 text-xs text-rose-500">{t('qr.noInvitations')}</p>}
            {createQrLink.isError && <p className="mt-3 text-xs text-rose-500">{toErrorMessage(createQrLink.error)}</p>}

            <button
                type="submit"
                disabled={createQrLink.isPending || (isInvitationTarget && !targetId)}
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {createQrLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('qr.create.submit')}
            </button>
        </form>
    );
}
