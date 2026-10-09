'use client';

import { useTranslations } from 'next-intl';

import { EventModuleRow } from '@/components/admin/events/EventModuleRow';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { useAdminPlatformModules } from '@/hooks/useAdmin';
import { useLocalizedModuleLabel } from '@/hooks/useLocalizedModuleLabel';
import { eventModuleRows } from '@/lib/adminEvents';
import type { AdminEventDetailDto } from '@/lib/api/types';

// Every module the event's type supports, included or not, so a missing one can be turned on in place.
export function EventModulesSection({
    event,
    editable,
    onGrantAction,
    onRevokeAction,
    onEditConfigAction,
}: {
    event: AdminEventDetailDto;
    editable: boolean;
    onGrantAction: (moduleKey: string) => void;
    onRevokeAction: (moduleKey: string) => void;
    onEditConfigAction: (moduleKey: string, configKey: string) => void;
}) {
    const t = useTranslations('AdminPage.events.modules');
    const modulesQuery = useAdminPlatformModules();
    const moduleLabel = useLocalizedModuleLabel(modulesQuery.data ?? []);
    const rows = eventModuleRows(event);

    return (
        <OrderCard title={t('title')}>
            {rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {rows.map((row) => {
                        const { name, Icon } = moduleLabel(row.moduleKey);
                        return (
                            <EventModuleRow
                                key={row.moduleKey}
                                row={row}
                                name={name}
                                Icon={Icon}
                                editable={editable}
                                onGrantAction={onGrantAction}
                                onRevokeAction={onRevokeAction}
                                onEditConfigAction={onEditConfigAction}
                            />
                        );
                    })}
                </ul>
            )}
        </OrderCard>
    );
}
