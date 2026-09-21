'use client';

import { useTranslations } from 'next-intl';

import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import type { Visibility } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanEditorAvailabilitySection({
    id,
    plan,
    visibility,
    isMakingDefault,
    onVisibilityChangeAction,
    onMakeDefaultAction,
}: {
    id: string;
    plan: PlanTierResponseDto;
    visibility: Visibility;
    isMakingDefault: boolean;
    onVisibilityChangeAction: (next: Visibility) => void;
    onMakeDefaultAction: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <section id={id} className="scroll-mt-14 pt-6">
            {/* Availability */}
            <h4 className="mb-3 text-sm font-bold text-ink">{t('plans.sections.availability')}</h4>
            <VisibilitySegmentedControl
                title={t('fields.visibility')}
                value={visibility}
                onChangeAction={onVisibilityChangeAction}
                labels={{ LIVE: t('fields.visibilityLive'), HIDDEN: t('fields.visibilityHidden'), ARCHIVED: t('fields.visibilityArchived') }}
                hints={{ LIVE: t('fields.visibilityLiveHint'), HIDDEN: t('fields.visibilityHiddenHint'), ARCHIVED: t('fields.visibilityArchivedHint') }}
            />

            {/* Default */}
            {!plan.isDefault && (
                <button
                    type="button"
                    onClick={onMakeDefaultAction}
                    disabled={isMakingDefault}
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-primary/40 bg-primary-light px-3 text-sm font-bold text-primary-dark transition hover:border-primary disabled:opacity-50"
                >
                    {t('plans.makeDefault')}
                </button>
            )}
        </section>
    );
}
