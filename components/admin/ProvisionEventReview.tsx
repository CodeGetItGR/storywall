'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { ProvisionEventForm } from '@/hooks/useProvisionEventForm';
import type { UserResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function ProvisionEventReview({ form, host }: { form: ProvisionEventForm; host: UserResponseDto }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const locale = useLocale();
    const localizedText = useLocalizedText();
    const eventType = form.eventTypes.find((item) => item.eventTypeKey === form.selectedEventType);
    const hostName = [host.firstName, host.lastName].filter(Boolean).join(' ') || host.email || t('unnamedHost');

    const rows = [
        [t('reviewHost'), hostName],
        [t('reviewEvent'), form.title.trim()],
        [t('reviewType'), eventType ? localizedText(eventType.name, eventType.eventTypeKey) : form.selectedEventType],
        [t('reviewDate'), formatDate(locale, form.startAt, { dateStyle: 'medium', timeStyle: 'short' })],
        [t('reviewPlan'), form.selectedPlan?.name ?? ''],
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
                            <dd className="text-right font-semibold text-ink">{value}</dd>
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
