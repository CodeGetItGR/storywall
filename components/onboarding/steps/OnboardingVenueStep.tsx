'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';

import { OnboardingStepIcon } from '@/components/onboarding/OnboardingStepIcon';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateEventSession } from '@/hooks/useEventSessions';
import type { EventSessionResponseDto } from '@/lib/api/types';

interface OnboardingVenueStepProps {
    eventId: string;
    sessions: EventSessionResponseDto[];
    defaultTitle: string;
    onDone: () => void;
}

export function OnboardingVenueStep({ eventId, sessions, defaultTitle, onDone }: OnboardingVenueStepProps) {
    const t = useTranslations('HostOnboarding');
    const toErrorMessage = useApiErrorMessage();
    const createSession = useCreateEventSession();

    const [wantsVenue, setWantsVenue] = useState(false);
    const [title, setTitle] = useState(defaultTitle);
    const [locationName, setLocationName] = useState('');
    const [error, setError] = useState<string | null>(null);

    function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
        setTitle(event.target.value);
    }

    function handleLocationNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLocationName(event.target.value);
    }

    function handleWantsVenue() {
        setWantsVenue(true);
    }

    async function handleAddVenue() {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        setError(null);
        const nextDisplayOrder = sessions.reduce((max, session) => Math.max(max, session.displayOrder), -1) + 1;

        try {
            await createSession.mutateAsync({
                eventId,
                title: trimmedTitle,
                locationName: locationName.trim() || undefined,
                displayOrder: nextDisplayOrder,
                isSecondary: true,
            });
            onDone();
        } catch (submitError) {
            setError(toErrorMessage(submitError));
        }
    }

    if (!wantsVenue) {
        return (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
                <OnboardingStepIcon icon={MapPin} />
                <div>
                    <h3 className="text-base font-semibold text-ink">{t('venue.askTitle')}</h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{t('venue.askBody')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onDone}
                        className="rounded-full bg-surface-muted px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70"
                    >
                        {t('venue.no')}
                    </button>
                    <button
                        type="button"
                        onClick={handleWantsVenue}
                        className="rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        {t('venue.yes')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 py-2">
            <div className="text-center">
                <h3 className="text-base font-semibold text-ink">{t('venue.formTitle')}</h3>
            </div>
            <FormFieldLabel
                label={t('venue.fields.title')}
                className="grid gap-1.5"
                labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
            >
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                />
            </FormFieldLabel>
            <FormFieldLabel
                label={t('venue.fields.locationName')}
                optional
                className="grid gap-1.5"
                labelClassName="text-xs font-semibold uppercase tracking-wide text-ink-muted"
            >
                <input
                    type="text"
                    value={locationName}
                    onChange={handleLocationNameChange}
                    placeholder={t('venue.placeholders.locationName')}
                    className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                />
            </FormFieldLabel>
            {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
            <button
                type="button"
                onClick={handleAddVenue}
                disabled={!title.trim() || createSession.isPending}
                className="w-full rounded-full bg-gradient-brand px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {createSession.isPending ? t('venue.adding') : t('venue.add')}
            </button>
        </div>
    );
}
