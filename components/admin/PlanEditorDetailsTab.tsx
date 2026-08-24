'use client';

import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminTabPanel } from '@/components/admin/AdminTabs';
import { VisibilitySegmentedControl } from '@/components/admin/VisibilitySegmentedControl';
import type { Visibility } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';

export function PlanEditorDetailsTab({
    editorId,
    activeTab,
    plan,
    visibility,
    onVisibilityChangeAction,
}: {
    editorId: string;
    activeTab: string;
    plan: PlanTierResponseDto;
    visibility: Visibility;
    onVisibilityChangeAction: (next: Visibility) => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <AdminTabPanel id={editorId} tabKey="details" active={activeTab} className="pt-5">
            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
                <AdminField label={t('fields.name')} required className="col-span-2">
                    <input name="name" defaultValue={plan.name} required maxLength={100} className={adminInputClass()} />
                </AdminField>
                <AdminField label={t('fields.sort')} optional className="col-span-1">
                    <input name="sortOrder" type="number" min={0} defaultValue={plan.sortOrder} className={adminInputClass('max-w-24')} />
                </AdminField>
                <AdminField label={t('fields.description')} optional className="col-span-2">
                    <input name="description" defaultValue={plan.description ?? ''} className={adminInputClass()} />
                </AdminField>
            </div>

            {/* Availability */}
            <AdminSection title={t('plans.sections.availability')} className="mt-1 border-t-0">
                <VisibilitySegmentedControl
                    title={t('fields.visibility')}
                    value={visibility}
                    onChangeAction={onVisibilityChangeAction}
                    labels={{
                        LIVE: t('fields.visibilityLive'),
                        HIDDEN: t('fields.visibilityHidden'),
                        ARCHIVED: t('fields.visibilityArchived'),
                    }}
                    hints={{
                        LIVE: t('fields.visibilityLiveHint'),
                        HIDDEN: t('fields.visibilityHiddenHint'),
                        ARCHIVED: t('fields.visibilityArchivedHint'),
                    }}
                />
            </AdminSection>
        </AdminTabPanel>
    );
}
