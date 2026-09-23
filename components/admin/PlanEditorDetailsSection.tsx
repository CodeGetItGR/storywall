'use client';

import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';

const SIBLING_CHIP = 'rounded-full bg-status-neutral-wash px-1.5 py-0.5 font-bold text-status-neutral';

export function PlanEditorDetailsSection({
    id,
    plan,
    eventTypes,
    siblings,
    onOpenSiblingAction,
}: {
    id: string;
    plan: PlanTierResponseDto;
    eventTypes: PlatformEventTypeResponseDto[];
    siblings: PlanTierResponseDto[];
    onOpenSiblingAction?: (plan: PlanTierResponseDto) => void;
}) {
    const t = useTranslations('AdminPage');
    const localizedText = useLocalizedText();
    const eventType = eventTypes.find((item) => item.eventTypeKey === plan.eventTypeKey);

    function eventTypeLabel(eventTypeKey: string | null) {
        const match = eventTypes.find((item) => item.eventTypeKey === eventTypeKey);
        return match ? localizedText(match.name, match.eventTypeKey) : null;
    }

    function handleSiblingClick(event: MouseEvent<HTMLButtonElement>) {
        const sibling = siblings.find((item) => item.id === event.currentTarget.dataset.planId);
        if (sibling) onOpenSiblingAction?.(sibling);
    }

    return (
        <section id={id} className="scroll-mt-14 pt-4">
            {/* Details */}
            <h4 className="mb-3 text-sm font-bold text-ink">{t('plans.sections.details')}</h4>
            <div className="grid grid-cols-2 gap-3">
                <AdminField label={t('fields.name')} required className="col-span-2">
                    <input name="name" defaultValue={plan.name} required maxLength={100} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.description')} optional className="col-span-2">
                    <input name="description" defaultValue={plan.description ?? ''} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.sort')} optional>
                    <input name="sortOrder" type="number" min={0} defaultValue={plan.sortOrder} className={adminInputClass('max-w-24')} />
                </AdminField>
            </div>

            {/* Read-only identifiers */}
            <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                <dt className="font-bold tracking-wide text-ink-muted uppercase">{t('fields.code')}</dt>
                <dd className="font-mono text-ink">{plan.code}</dd>
                {eventType && (
                    <>
                        <dt className="font-bold tracking-wide text-ink-muted uppercase">{t('plans.coverage.eventTypeLabel')}</dt>
                        <dd className="text-ink">{localizedText(eventType.name, eventType.eventTypeKey)}</dd>
                    </>
                )}
                {siblings.length > 0 && (
                    <>
                        <dt className="font-bold tracking-wide text-ink-muted uppercase">{t('plans.sharedGroup.label')}</dt>
                        <dd className="flex flex-wrap gap-1">
                            {siblings.map((sibling) =>
                                onOpenSiblingAction ? (
                                    <button
                                        key={sibling.id}
                                        type="button"
                                        data-plan-id={sibling.id}
                                        onClick={handleSiblingClick}
                                        className={`${SIBLING_CHIP} hover:text-ink`}
                                    >
                                        {eventTypeLabel(sibling.eventTypeKey) ?? sibling.code}
                                    </button>
                                ) : (
                                    <span key={sibling.id} className={SIBLING_CHIP}>
                                        {eventTypeLabel(sibling.eventTypeKey) ?? sibling.code}
                                    </span>
                                ),
                            )}
                        </dd>
                    </>
                )}
            </dl>
        </section>
    );
}
