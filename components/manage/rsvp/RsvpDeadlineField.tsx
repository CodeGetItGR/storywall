'use client';

import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUpdateEvent } from '@/hooks/useEvent';
import { getFieldErrors } from '@/lib/api/errors';
import { toDatetimeLocalValue } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const inputClass =
    'w-full bg-surface-muted rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'text-xs font-semibold text-ink-muted uppercase tracking-wide';

export function RsvpDeadlineField({ eventId, rsvpDeadline, canWrite }: { eventId: string; rsvpDeadline: string | null; canWrite: boolean }) {
    const t = useTranslations('ManagePage');
    const toErrorMessage = useApiErrorMessage();
    const updateEvent = useUpdateEvent(eventId);
    const fieldErrors = getFieldErrors(updateEvent.error);

    const savedValue = toDatetimeLocalValue(rsvpDeadline);
    const [value, setValue] = useState(savedValue);
    const [savedValues, setSavedValues] = useState(savedValue);
    const [saved, setSaved] = useState(false);

    const hasChanges = Boolean(value && value !== savedValues);
    const disabled = !canWrite;
    const isSaving = updateEvent.isPending;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValue(e.target.value);
        setSaved(false);
    }

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!canWrite || !hasChanges) return;
        setSaved(false);

        try {
            await updateEvent.mutateAsync({ rsvpDeadline: new Date(value).toISOString() });
            setSavedValues(value);
            setSaved(true);
        } catch {
            // error surfaced inline below
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <FormFieldLabel label={t('rsvpStats.deadlineField')} optional labelClassName={labelClass}>
                <input type="datetime-local" value={value} onChange={handleChange} disabled={disabled} className={inputClass} />
                {fieldErrors?.rsvpDeadline && <span className="text-xs text-rose-500">{fieldErrors.rsvpDeadline}</span>}
            </FormFieldLabel>

            {updateEvent.isError && !fieldErrors && <p className="text-xs text-rose-500">{toErrorMessage(updateEvent.error)}</p>}

            <div className={cn('flex items-center justify-end gap-3', !hasChanges && !saved && 'hidden')}>
                {saved && !isSaving && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        {t('settings.saved')}
                    </span>
                )}
                <button
                    type="submit"
                    disabled={disabled || isSaving || !hasChanges}
                    className={cn(
                        'items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40',
                        hasChanges ? 'flex' : 'hidden',
                    )}
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.save')}
                </button>
            </div>
        </form>
    );
}
