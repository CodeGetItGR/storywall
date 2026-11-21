// components/manage/nav/ManageShell.tsx
'use client';

import { ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { ManageSectionHeader } from '@/components/manage/nav/ManageSectionHeader';
import { ManageSectionList } from '@/components/manage/nav/ManageSectionList';
import { ManageSidebar } from '@/components/manage/nav/ManageSidebar';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { BackButton } from '@/components/ui/BackButton';
import type { ManageNav } from '@/hooks/useManageNav';
import { useManageSectionLabel } from '@/hooks/useManageSectionLabel';
import { useSectionMenuScroll } from '@/hooks/useSectionMenuScroll';
import type { ManageNavKey, ManageSection } from '@/lib/manageSections';
import { routes } from '@/lib/routes';
import { eventStatusBadgeTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

type ManageShellProps = {
    nav: ManageNav;
    active: ManageNavKey;
    // Given by the dashboard page itself, so its sections switch in place.
    onSelectSection?: (section: ManageSection) => void;
    children: ReactNode;
};

/**
 * The host dashboard's frame, shared by its sections and its own pages.
 * Desktop: event header, grouped sidebar and the page heading.
 * Small screens: the Overview keeps the event header and lists every entry below its
 * content; every other page gets header B in its place. A draft has no nav.
 */
export function ManageShell({ nav, active, onSelectSection, children }: ManageShellProps) {
    const { activeEvent } = useEventRouteContext();
    const t = useTranslations('ManagePage');
    const tTabBar = useTranslations('MobileTabBar');
    const label = useManageSectionLabel();
    const showNav = !nav.isDraft;
    const onOverview = active === 'overview';
    const showSectionHeader = showNav && !onOverview;
    const showSectionList = showNav && onOverview;
    const { menuRef, scrollToMenu } = useSectionMenuScroll();
    const backToOverview = useCallback(() => onSelectSection?.('overview'), [onSelectSection]);

    return (
        // A draft ends in its sticky pay bar on mobile, which has to reach the tab bar.
        <div className={cn('mx-auto w-full max-w-6xl', nav.isDraft ? 'lg:pb-10' : 'pb-10')}>
            {/* Section header (small screens) */}
            {showSectionHeader && (
                <ManageSectionHeader eventId={nav.eventId} title={label(active)} onSelectSection={onSelectSection ? backToOverview : undefined} />
            )}

            {/* Header */}
            <div
                className={cn(
                    'sticky top-0 z-20 border-b border-border/60 bg-event/95 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none',
                    showSectionHeader && 'hidden lg:block',
                )}
            >
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-5">
                    {/* Back (draft): it has no feed or sections to move to */}
                    {nav.isDraft && <BackButton variant="icon" href={routes.home} label={t('draft.backToEvents')} className="-ml-2 self-center" />}

                    <div className="min-w-0 flex-1">
                        <h1 className="mt-0.5 truncate text-lg leading-tight font-bold text-ink sm:text-xl lg:text-2xl">{activeEvent.title}</h1>
                    </div>
                    <span
                        className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap',
                            eventStatusBadgeTone[activeEvent.status],
                        )}
                    >
                        {t(`status.${activeEvent.status}`)}
                    </span>

                    {/* Menu (small screens): jumps to the section menu at the end of the Overview */}
                    {showSectionList && (
                        <button
                            type="button"
                            onClick={scrollToMenu}
                            className="-my-1 flex min-h-8 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-bold text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none lg:hidden"
                        >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            {tTabBar('menu')}
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pt-4 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-5">
                {/* Sections (desktop) */}
                {showNav && (
                    <ManageSidebar
                        eventId={nav.eventId}
                        groups={nav.groups}
                        showDanger={nav.showDanger}
                        active={active}
                        onSelectSection={onSelectSection}
                        className="sticky top-6 hidden self-start lg:flex"
                    />
                )}

                <div
                    className={cn(
                        'min-w-0',
                        nav.isDraft && 'flex min-h-[60svh] flex-col justify-center lg:col-span-2 lg:min-h-0 lg:max-w-4xl lg:justify-start',
                    )}
                >
                    {/* Page heading (desktop) */}
                    {showNav && <h2 className="mb-4 hidden text-sm font-bold tracking-wide text-ink-muted uppercase lg:block">{label(active)}</h2>}

                    {children}

                    {/* Sections (small screens): the Overview is the menu */}
                    {showSectionList && (
                        <ManageSectionList
                            ref={menuRef}
                            eventId={nav.eventId}
                            groups={nav.groups}
                            showDanger={nav.showDanger}
                            onSelectSection={onSelectSection}
                            className="mt-8 scroll-mt-24 lg:hidden"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
