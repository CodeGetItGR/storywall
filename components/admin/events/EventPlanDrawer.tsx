'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { EventDrawerFooter } from '@/components/admin/events/EventDrawerFooter';
import { LoadingState } from '@/components/ui/LoadingState';
import { useEventPlanChange } from '@/hooks/useEventPlanChange';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminEventDetailDto } from '@/lib/api/types';

const FORM_ID = 'event-plan-form';

export function EventPlanDrawer({ open, event, onCloseAction }: { open: boolean; event: AdminEventDetailDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage');
    const form = useEventPlanChange(event, onCloseAction);

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            closeLabel={t('cancel')}
            title={t('events.plan.drawerTitle')}
            subtitle={event.title ?? t('events.untitled')}
            footer={
                <EventDrawerFooter
                    formId={FORM_ID}
                    saveLabel={t('events.plan.save')}
                    canSave={form.canSave}
                    isSaving={form.isSaving}
                    onCancelAction={onCloseAction}
                />
            }
        >
            <form id={FORM_ID} onSubmit={form.handleSubmit} noValidate className="space-y-6">
                {/* Plans */}
                {form.isLoading && <LoadingState label={t('events.plan.loading')} className="justify-start py-2" />}
                {Boolean(form.loadError) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.loadError)}`)}</p>}
                {!form.isLoading && !form.loadError && form.plans.length === 0 && <p className="text-sm text-ink-muted">{t('events.plan.noPlans')}</p>}
                {form.plans.length > 0 && (
                    <AdminField label={t('events.plan.field')} hint={t('events.plan.hint')}>
                        <select value={form.planCode} onChange={form.handlePlanChange} className={adminInputClass()}>
                            {form.plans.map((plan) => (
                                <option key={plan.code} value={plan.code}>
                                    {plan.name} ({plan.code})
                                </option>
                            ))}
                        </select>
                    </AdminField>
                )}

                {/* Save error */}
                {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
