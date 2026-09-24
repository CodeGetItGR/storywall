'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent, MouseEvent } from 'react';

import { AdminDurationSelect } from '@/components/admin/AdminDurationSelect';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { ProvisionEventForm as ProvisionEventFormState } from '@/hooks/useProvisionEventForm';
import type { EventTypeConvention, EventVisibility } from '@/lib/api/types';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

export function ProvisionEventForm({ form }: { form: ProvisionEventFormState }) {
    const t = useTranslations('AdminPage.accounts.provision');
    const tAdmin = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const selectedPlan = form.selectedPlan;

    function handleEventTypeChange(event: ChangeEvent<HTMLSelectElement>) {
        form.changeEventType(event.target.value as EventTypeConvention);
    }

    function handlePlanChange(event: ChangeEvent<HTMLSelectElement>) {
        form.setPlanTierCode(event.target.value);
    }

    function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
        form.setTitle(event.target.value);
    }

    function handleStartChange(event: ChangeEvent<HTMLInputElement>) {
        form.setStartAt(event.target.value);
    }

    function handleEndChange(event: ChangeEvent<HTMLInputElement>) {
        form.setEndAt(event.target.value);
    }

    function handleTimezoneChange(event: ChangeEvent<HTMLInputElement>) {
        form.setTimezone(event.target.value);
    }

    function handleLocationNameChange(event: ChangeEvent<HTMLInputElement>) {
        form.setLocationName(event.target.value);
    }

    function handleLocationAddressChange(event: ChangeEvent<HTMLInputElement>) {
        form.setLocationAddress(event.target.value);
    }

    function handleMapsUrlChange(event: ChangeEvent<HTMLInputElement>) {
        form.setMapsUrl(event.target.value);
    }

    function handleVisibilityClick(event: MouseEvent<HTMLButtonElement>) {
        form.setVisibility(event.currentTarget.dataset.visibility as EventVisibility);
    }

    return (
        <div className="space-y-8">
            {/* Event setup */}
            <section aria-labelledby="provision-event-setup" className="space-y-4">
                <div>
                    <h3 id="provision-event-setup" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                        {t('eventSection')}
                    </h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label={t('eventType')} required>
                        <select required value={form.selectedEventType} onChange={handleEventTypeChange} className={adminInputClass()}>
                            {form.eventTypes.map((eventType) => (
                                <option key={eventType.eventTypeKey} value={eventType.eventTypeKey}>
                                    {localizedText(eventType.name, eventType.eventTypeKey)}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                    <AdminField label={t('plan')} required>
                        <select
                            required
                            value={form.planTierCode}
                            onChange={handlePlanChange}
                            className={adminInputClass()}
                            disabled={!form.selectedEventType || form.eligiblePlans.length === 0}
                        >
                            <option value="">{t('choosePlan')}</option>
                            {form.eligiblePlans.map((plan) => (
                                <option key={plan.id} value={plan.code}>
                                    {plan.name}
                                    {plan.isPublic ? '' : ` · ${t('internal')}`}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                    {selectedPlan ? (
                        <AdminField label={t('duration')} required>
                            <AdminDurationSelect pick={form.duration} currency={selectedPlan.priceCurrency} className={adminInputClass()} />
                        </AdminField>
                    ) : null}
                </div>
                {form.selectedEventType && !form.plansQuery.isLoading && form.eligiblePlans.length === 0 ? (
                    <p className="rounded-lg bg-status-warn-wash px-4 py-3 text-sm text-status-warn">{t('noPlans')}</p>
                ) : null}
                {selectedPlan ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
                        {!selectedPlan.isPublic ? (
                            <span className="rounded-full bg-status-neutral-wash px-2 py-1 font-bold text-status-neutral">{t('internal')}</span>
                        ) : null}
                        <span>{t('memberLimit', { value: formatLimitValue(selectedPlan.maxMembers, 'count') ?? tAdmin('unlimited') })}</span>
                        <span>{t('storageLimit', { value: formatLimitValue(selectedPlan.storageBytes, 'bytes') ?? tAdmin('unlimited') })}</span>
                    </div>
                ) : null}
            </section>

            {/* Details */}
            <section aria-labelledby="provision-event-details" className="space-y-4 border-t border-border pt-6">
                <h3 id="provision-event-details" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('detailsSection')}
                </h3>
                <AdminField label={t('eventName')} required>
                    <input
                        required
                        value={form.title}
                        onChange={handleTitleChange}
                        className={adminInputClass()}
                        aria-invalid={Boolean(form.fieldError('title'))}
                    />
                    {form.fieldError('title') ? <span className="text-xs text-status-danger">{form.fieldError('title')}</span> : null}
                </AdminField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label={t('startAt')} required>
                        <input
                            required
                            type="datetime-local"
                            value={form.startAt}
                            min={form.startAtMin}
                            max={form.startAtMax}
                            onChange={handleStartChange}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('endAt')} required>
                        <input
                            required
                            type="datetime-local"
                            value={form.endAt}
                            min={form.endAtMin}
                            onChange={handleEndChange}
                            className={adminInputClass()}
                        />
                    </AdminField>
                </div>
                {form.scheduleError ? <p className="text-xs text-status-danger">{form.scheduleError}</p> : null}
                <AdminField label={t('timezone')} required>
                    <input
                        required
                        list="provision-timezones"
                        value={form.timezone}
                        onChange={handleTimezoneChange}
                        className={adminInputClass()}
                        aria-invalid={Boolean(form.timezoneError)}
                    />
                    <datalist id="provision-timezones">
                        {form.timezoneOptions.map((timezone) => (
                            <option key={timezone} value={timezone} />
                        ))}
                    </datalist>
                    {form.timezoneError ? <span className="text-xs text-status-danger">{form.timezoneError}</span> : null}
                </AdminField>
            </section>

            {/* Location */}
            <section aria-labelledby="provision-event-location" className="space-y-4 border-t border-border pt-6">
                <h3 id="provision-event-location" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('locationSection')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <AdminField label={t('locationName')} required>
                        <input required value={form.locationName} onChange={handleLocationNameChange} className={adminInputClass()} />
                    </AdminField>
                    <AdminField label={t('locationAddress')} required>
                        <input required value={form.locationAddress} onChange={handleLocationAddressChange} className={adminInputClass()} />
                    </AdminField>
                </div>
                <AdminField label={t('mapsUrl')} optional>
                    <input type="url" value={form.mapsUrl} onChange={handleMapsUrlChange} className={adminInputClass()} />
                </AdminField>
            </section>

            {/* Visibility */}
            <section aria-labelledby="provision-event-visibility" className="border-t border-border pt-6">
                <h3 id="provision-event-visibility" className="mb-3 text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('visibility')}
                </h3>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
                    {(['PRIVATE', 'PUBLIC'] as EventVisibility[]).map((visibility) => (
                        <button
                            key={visibility}
                            type="button"
                            aria-pressed={form.visibility === visibility}
                            data-visibility={visibility}
                            onClick={handleVisibilityClick}
                            className={cn(
                                'rounded-md px-3 py-2 text-sm font-bold transition-colors',
                                form.visibility === visibility ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                            )}
                        >
                            {t(`visibilityOption.${visibility}`)}
                        </button>
                    ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-faint">{t(`visibilityHint.${form.visibility}`)}</p>
            </section>
        </div>
    );
}
