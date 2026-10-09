'use client';

import { useLocale, useTranslations } from 'next-intl';

import { EventUsageMeter, type UsageShare } from '@/components/admin/events/EventUsageMeter';
import { OrderCard } from '@/components/admin/orders/OrderCard';
import { usageRatio } from '@/lib/adminEvents';
import type { AdminEventDetailDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';

// Storage and members side by side, each split into what the plan gives, what was bought and what
// an admin added. The admin share is what the edit sets, so it is always listed when the plan is limited.
export function EventUsageSection({
    usage,
    editable,
    onEditStorageAction,
    onEditMembersAction,
}: {
    usage: AdminEventDetailDto['usage'];
    editable: boolean;
    onEditStorageAction: () => void;
    onEditMembersAction: () => void;
}) {
    const t = useTranslations('AdminPage.events.limits');
    const locale = useLocale();
    const count = (value: number) => value.toLocaleString(locale);

    const storageShares: UsageShare[] =
        usage.planStorageBytes === null
            ? []
            : [
                  { key: 'plan', label: t('fromPlan'), value: formatBytes(usage.planStorageBytes) },
                  ...(usage.purchasedExtraStorageBytes > 0
                      ? [{ key: 'purchased', label: t('purchased'), value: `+ ${formatBytes(usage.purchasedExtraStorageBytes)}` }]
                      : []),
                  { key: 'granted', label: t('granted'), value: `+ ${formatBytes(usage.grantedStorageBytes)}` },
              ];

    const memberShares: UsageShare[] =
        usage.planMaxMembers === null
            ? []
            : [
                  { key: 'plan', label: t('fromPlan'), value: count(usage.planMaxMembers) },
                  { key: 'granted', label: t('granted'), value: `+ ${count(usage.extraMemberSlots)}` },
              ];

    return (
        <OrderCard title={t('title')}>
            <div className="grid gap-8 sm:grid-cols-2">
                {/* Storage */}
                <EventUsageMeter
                    label={t('storage')}
                    used={formatBytes(usage.storageBytes)}
                    limit={usage.storageLimitBytes === null ? null : formatBytes(usage.storageLimitBytes)}
                    ratio={usageRatio(usage.storageBytes, usage.storageLimitBytes)}
                    shares={storageShares}
                    editLabel={editable && usage.planStorageBytes !== null ? t('edit') : null}
                    onEditAction={onEditStorageAction}
                />

                {/* Members */}
                <EventUsageMeter
                    label={t('members')}
                    used={count(usage.memberCount)}
                    limit={usage.memberLimit === null ? null : count(usage.memberLimit)}
                    ratio={usageRatio(usage.memberCount, usage.memberLimit)}
                    shares={memberShares}
                    editLabel={editable && usage.planMaxMembers !== null ? t('edit') : null}
                    onEditAction={onEditMembersAction}
                />
            </div>
        </OrderCard>
    );
}
