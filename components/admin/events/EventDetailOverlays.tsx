'use client';

import { useTranslations } from 'next-intl';

import { EventConfirmModal } from '@/components/admin/events/EventConfirmModal';
import { EventMemberGrantDrawer } from '@/components/admin/events/EventMemberGrantDrawer';
import { EventModuleGrantDrawer } from '@/components/admin/events/EventModuleGrantDrawer';
import { EventPlanDrawer } from '@/components/admin/events/EventPlanDrawer';
import { EventRestrictionModal } from '@/components/admin/events/EventRestrictionModal';
import { EventStorageGrantDrawer } from '@/components/admin/events/EventStorageGrantDrawer';
import { useAdminPlatformModules } from '@/hooks/useAdmin';
import { useEventConfirmActions } from '@/hooks/useEventConfirmActions';
import type { EventDetailOverlays as Overlays } from '@/hooks/useEventDetailOverlays';
import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import type { AdminEventDetailDto } from '@/lib/api/types';

// Every drawer and confirmation the event page opens. Only the last one opened is mounted.
export function EventDetailOverlays({ event, overlays }: { event: AdminEventDetailDto; overlays: Overlays }) {
    const t = useTranslations('AdminPage.events');
    const modulesQuery = useAdminPlatformModules();
    const moduleLabel = useLocalizedModuleLabel(modulesQuery.data ?? []);
    const actions = useEventConfirmActions(event.id, overlays.overlay, overlays.close);
    const { overlay, openCount, isOpen } = overlays;
    const key = String(openCount);

    if (!overlay) return null;

    switch (overlay.kind) {
        case 'storage':
            return <EventStorageGrantDrawer key={key} open={isOpen('storage')} event={event} onCloseAction={overlays.close} />;
        case 'members':
            return <EventMemberGrantDrawer key={key} open={isOpen('members')} event={event} onCloseAction={overlays.close} />;
        case 'plan':
            return <EventPlanDrawer key={key} open={isOpen('plan')} event={event} onCloseAction={overlays.close} />;
        case 'grantModule': {
            const label = moduleLabel(overlay.moduleKey);
            return (
                <EventModuleGrantDrawer
                    key={key}
                    open={isOpen('grantModule')}
                    eventId={event.id}
                    moduleKey={overlay.moduleKey}
                    moduleName={label.name}
                    moduleDescription={label.description}
                    onCloseAction={overlays.close}
                />
            );
        }
        case 'revokeModule':
            return (
                <EventConfirmModal
                    open={isOpen('revokeModule')}
                    title={t('modules.revokeTitle', { module: moduleLabel(overlay.moduleKey).name })}
                    body={t('modules.revokeBody')}
                    confirmLabel={t('modules.revokeConfirm')}
                    action={actions.revoke}
                    onCloseAction={actions.close}
                />
            );
        case 'removeAddon':
            return (
                <EventConfirmModal
                    open={isOpen('removeAddon')}
                    title={t('addons.removeTitle', { addon: overlay.name })}
                    body={t('addons.removeBody')}
                    confirmLabel={t('addons.removeConfirm')}
                    action={actions.removeAddon}
                    onCloseAction={actions.close}
                />
            );
        case 'lift':
            return (
                <EventConfirmModal
                    open={isOpen('lift')}
                    tone="default"
                    title={t('restriction.liftTitle')}
                    body={t('restriction.liftBody')}
                    confirmLabel={t('restriction.liftConfirm')}
                    action={actions.lift}
                    onCloseAction={actions.close}
                />
            );
        case 'suspend':
            return <EventRestrictionModal key={key} open={isOpen('suspend')} eventId={event.id} mode="suspend" onCloseAction={overlays.close} />;
        case 'close':
            return <EventRestrictionModal key={key} open={isOpen('close')} eventId={event.id} mode="close" onCloseAction={overlays.close} />;
    }
}
