'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useCreateEventFieldLabels } from '@/hooks/useCreateEventFieldLabels';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { ProvisionEventForm } from '@/hooks/useProvisionEventForm';
import type { ProvisionHost } from '@/lib/adminAccountProvisioning';
import type { EventTypeConvention } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function ProvisionEventReview({ form, host }: { form: ProvisionEventForm; host: ProvisionHost }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const localizedText = useLocalizedText();
    const fieldLabels = useCreateEventFieldLabels(form.selectedEventType as EventTypeConvention);
    const eventType = form.eventTypes.find((item) => item.eventTypeKey === form.selectedEventType);
    const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ') || host.email || t('unnamedHost');

    const description = form.description.trim();
    const rsvpDeadline = form.planHasRsvp ? form.rsvpDeadline : '';
    const theme = form.selectedThemePreset;

    // Optional fields show only when set.
    const rows: [string, string][] = [
        [t('reviewHost'), hostName],
        [fieldLabels.title, form.title.trim()],
        ...(description ? [[t('reviewDescription'), description] as [string, string]] : []),
        [t('reviewType'), eventType ? localizedText(eventType.name, eventType.eventTypeKey) : form.selectedEventType],
        [fieldLabels.startAt, formatDate(locale, form.startAt, { dateStyle: 'medium', timeStyle: 'short' })],
        ...(rsvpDeadline
            ? [[t('reviewRsvpDeadline'), formatDate(locale, rsvpDeadline, { dateStyle: 'medium', timeStyle: 'short' })] as [string, string]]
            : []),
        [t('reviewPlan'), form.selectedPlan?.name ?? ''],
        [t('reviewDuration'), form.duration.selectedOption ? tAdmin('plans.columns.months', { count: form.duration.selectedOption.months }) : ''],
        ...(theme ? [[t('reviewTheme'), localizedText(theme.name, theme.key)] as [string, string]] : []),
        [t('reviewVisibility'), t(`visibilityOption.${form.visibility}`)],
    ];

    return (
        <div className="space-y-7">
            {/* Review */}
            <section aria-labelledby="provision-review-heading">
                <h3 id="provision-review-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('reviewTitle')}
                </h3>
                <dl className="mt-3 divide-y divide-border">
                    {rows.map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[9rem_1fr] gap-5 py-3.5 text-sm">
                            <dt className="text-ink-faint">{label}</dt>
                            <dd className="text-right font-semibold break-words whitespace-pre-line text-ink">{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Activation notice */}
            <p className="rounded-lg bg-canvas px-4 py-3 text-sm leading-6 text-ink-muted">{t('activeNotice')}</p>
            {form.error ? (
                <p role="alert" className="rounded-lg bg-status-danger-wash px-4 py-3 text-sm text-status-danger">
                    {form.error}
                </p>
            ) : null}
        </div>
    );
}
