'use client';

import { useTranslations } from 'next-intl';

import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import { MemberActionsSection } from '@/components/layout/right-context-panel/MemberActionsSection';
import { useRightContextPanel } from '@/hooks/useRightContextPanel';

// On the feed's theme the panel is a white curtain with all its text in ink: the theme shows through and the text
// reads over any picture. Without a theme it keeps the page's colour and its own text tones, or the page's on a dark colour.
export function RightContextPanel({ liteHome = false }: { liteHome?: boolean }) {
    const t = useTranslations('RightContextPanel');
    const panel = useRightContextPanel({ liteHome });

    if (!panel.visible || !panel.activeEvent) return null;

    return (
        <aside
            aria-label={panel.isHost ? t('hostConsole') : t('eventTools')}
            className="on-page on-page-curtain sticky top-0 no-scrollbar hidden h-[calc(100vh-var(--site-notice-h,0px))] w-75 shrink-0 flex-col overflow-y-auto border-l border-border bg-event md:flex [.feed-backdrop_&]:bg-white/50 [.feed-backdrop_&]:[--ink-faint:var(--ink)] [.feed-backdrop_&]:[--ink-muted:var(--ink)]"
        >
            <div className="flex h-full flex-col p-5">
                {panel.isHost ? (
                    <HostContextSections panel={panel} showMembersUsage={!liteHome} />
                ) : (
                    <MemberActionsSection items={panel.actionItems} />
                )}
            </div>
        </aside>
    );
}
