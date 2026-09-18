'use client';

import { CreditCard, HelpCircle, LayoutDashboard, type LucideIcon, Settings, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { type ManageSection, manageSections } from '@/lib/manageSections';
import { cn } from '@/lib/utils';

export const sectionIcons: Record<ManageSection, LucideIcon> = {
    overview: LayoutDashboard,
    settings: Settings,
    help: HelpCircle,
    danger: Trash2,
    members: Users,
    rsvp: Users,
    billing: CreditCard,
};

/**
 * The one section list, rendered as the desktop sidebar and inside the mobile
 * section sheet. Everything the host can open lives at this single level, in
 * a fixed order. `visibleSections` narrows the list — e.g. hiding "Danger
 * zone" from co-hosts who aren't allowed to delete the event.
 */
export function ManageSectionNav({
    active,
    onSelectAction,
    visibleSections,
    className,
}: {
    active: ManageSection;
    onSelectAction: (section: ManageSection) => void;
    visibleSections?: ManageSection[];
    className?: string;
}) {
    const t = useTranslations('ManagePage');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const next = event.currentTarget.dataset.section as ManageSection | undefined;
        if (next) onSelectAction(next);
    }

    const sections = visibleSections ? manageSections.filter((section) => visibleSections.includes(section)) : manageSections;

    return (
        <nav aria-label={t('title')} className={cn('flex flex-col space-y-px', className)}>
            {sections.map((section) => {
                const Icon = sectionIcons[section];
                const isActive = section === active;

                return (
                    <button
                        key={section}
                        type="button"
                        data-section={section}
                        onClick={handleClick}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                            'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition-colors',
                            isActive ? 'bg-primary-light text-primary-dark' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                        )}
                    >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                        <span className="truncate">{t(`sections.${section}`)}</span>
                    </button>
                );
            })}
        </nav>
    );
}
