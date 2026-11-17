// components/manage/nav/ManageSidebar.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { manageNavIcons } from '@/components/manage/nav/manageNavIcons';
import { ManageNavLink } from '@/components/manage/nav/ManageNavLink';
import { useManageSectionLabel } from '@/hooks/useManageSectionLabel';
import type { ManageNavGroup, ManageNavKey, ManageSection } from '@/lib/manageSections';
import { cn } from '@/lib/utils';

type ManageSidebarProps = {
    eventId: string;
    groups: ManageNavGroup[];
    showDanger: boolean;
    active: ManageNavKey;
    onSelectSection?: (section: ManageSection) => void;
    className?: string;
};

/** The dashboard sidebar (desktop): every entry under its group heading, Danger zone apart at the end. */
export function ManageSidebar({ eventId, groups, showDanger, active, onSelectSection, className }: ManageSidebarProps) {
    const t = useTranslations('ManagePage');
    const idPrefix = useId();

    return (
        <nav aria-label={t('title')} className={cn('flex flex-col gap-5', className)}>
            {/* Groups */}
            {groups.map((group) => (
                <div key={group.key} role="group" aria-labelledby={`${idPrefix}-${group.key}`} className="flex flex-col gap-px">
                    <span id={`${idPrefix}-${group.key}`} className="px-3 pb-1.5 text-xs font-bold text-ink-muted">
                        {t(`navGroups.${group.key}`)}
                    </span>
                    {group.items.map((key) => (
                        <SidebarItem key={key} eventId={eventId} navKey={key} active={key === active} onSelectSection={onSelectSection} />
                    ))}
                </div>
            ))}

            {/* Danger zone */}
            {showDanger && (
                <div className="border-t border-border/70 pt-3">
                    <SidebarItem eventId={eventId} navKey="danger" active={active === 'danger'} onSelectSection={onSelectSection} />
                </div>
            )}
        </nav>
    );
}

function SidebarItem({
    eventId,
    navKey,
    active,
    onSelectSection,
}: {
    eventId: string;
    navKey: ManageNavKey;
    active: boolean;
    onSelectSection?: (section: ManageSection) => void;
}) {
    const label = useManageSectionLabel();
    const Icon = manageNavIcons[navKey];
    const isDanger = navKey === 'danger';

    return (
        <ManageNavLink
            eventId={eventId}
            navKey={navKey}
            active={active}
            onSelectSection={onSelectSection}
            className={cn(
                'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition-colors',
                active
                    ? 'bg-primary-light text-primary-dark'
                    : isDanger
                      ? 'text-status-danger hover:bg-status-danger-wash'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
            )}
        >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
            <span className="truncate">{label(navKey)}</span>
        </ManageNavLink>
    );
}
