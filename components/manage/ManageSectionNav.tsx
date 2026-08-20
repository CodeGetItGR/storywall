'use client';

import { CreditCard, LayoutDashboard, type LucideIcon, Receipt, RotateCcw, Settings, ShieldCheck, Ticket, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { type ManageSection, manageSectionGroups } from '@/lib/manageSections';
import { cn } from '@/lib/utils';

export const sectionIcons: Record<ManageSection, LucideIcon> = {
    overview: LayoutDashboard,
    settings: Settings,
    rsvp: Users,
    invitations: Ticket,
    plan: CreditCard,
    coverage: ShieldCheck,
    orders: Receipt,
    refund: RotateCcw,
};

/**
 * The one section list, rendered as the desktop sidebar and inside the mobile
 * section sheet. Everything the host can open lives at this single level.
 */
export function ManageSectionNav({
    active,
    onSelect,
    className,
}: {
    active: ManageSection;
    onSelect: (section: ManageSection) => void;
    className?: string;
}) {
    const t = useTranslations('ManagePage');

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        const next = event.currentTarget.dataset.section as ManageSection | undefined;
        if (next) onSelect(next);
    }

    return (
        <nav aria-label={t('title')} className={cn('flex flex-col gap-5', className)}>
            {manageSectionGroups.map(({ group, sections }) => (
                <div key={group}>
                    <p className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">{t(`groups.${group}`)}</p>
                    <div className="space-y-px">
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
                    </div>
                </div>
            ))}
        </nav>
    );
}
