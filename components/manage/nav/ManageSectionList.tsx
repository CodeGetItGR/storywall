// components/manage/nav/ManageSectionList.tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { manageNavIcons } from '@/components/manage/nav/manageNavIcons';
import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import { useManageSectionLabel } from '@/hooks/useManageSectionLabel';
import type { ManageNavGroup, ManageNavKey, ManageSection } from '@/lib/manageSections';
import { cn } from '@/lib/utils';

type ManageSectionListProps = {
    eventId: string;
    groups: ManageNavGroup[];
    showDanger: boolean;
    onSelectSection?: (section: ManageSection) => void;
    className?: string;
};

/** Small screens: the Overview is the menu, listing every other entry by group, Danger zone last. */
export function ManageSectionList({ eventId, groups, showDanger, onSelectSection, className }: ManageSectionListProps) {
    const t = useTranslations('ManagePage');
    const idPrefix = useId();
    const listedGroups = groups
        .map((group) => ({ ...group, items: group.items.filter((key) => key !== 'overview') }))
        .filter((group) => group.items.length > 0);

    return (
        <nav aria-label={t('title')} className={cn('flex flex-col gap-4', className)}>
            {/* Groups */}
            {listedGroups.map((group) => (
                <div key={group.key} role="group" aria-labelledby={`${idPrefix}-${group.key}`} className="flex flex-col">
                    <span id={`${idPrefix}-${group.key}`} className="px-1 text-xs font-bold text-ink-muted">
                        {t(`navGroups.${group.key}`)}
                    </span>
                    {group.items.map((key) => (
                        <ListRow key={key} eventId={eventId} navKey={key} onSelectSection={onSelectSection} />
                    ))}
                </div>
            ))}

            {/* Danger zone */}
            {showDanger && (
                <div className="border-t border-border/70 pt-1.5">
                    <ListRow eventId={eventId} navKey="danger" onSelectSection={onSelectSection} />
                </div>
            )}
        </nav>
    );
}

function ListRow({ eventId, navKey, onSelectSection }: { eventId: string; navKey: ManageNavKey; onSelectSection?: (section: ManageSection) => void }) {
    const label = useManageSectionLabel();
    const Icon = manageNavIcons[navKey];
    const isDanger = navKey === 'danger';

    return (
        <ManageNavLink
            eventId={eventId}
            navKey={navKey}
            onSelectSection={onSelectSection}
            className={cn('flex min-h-14 items-center gap-3.5 px-1 text-[15px] font-semibold', isDanger ? 'text-status-danger' : 'text-ink')}
        >
            <span
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isDanger ? 'bg-status-danger-wash text-status-danger' : 'bg-surface-muted text-primary',
                )}
            >
                <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate">{label(navKey)}</span>
            {!isDanger && <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />}
        </ManageNavLink>
    );
}
