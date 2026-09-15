'use client';

import { useTranslations } from 'next-intl';

import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import { MemberActionsSection } from '@/components/layout/right-context-panel/MemberActionsSection';
import { useRightContextPanel } from '@/hooks/useRightContextPanel';

export function RightContextPanel() {
    const t = useTranslations('RightContextPanel');
    const panel = useRightContextPanel();

    if (!panel.visible || !panel.activeEvent) return null;

    return (
        <aside
            aria-label={panel.isHost ? t('hostConsole') : t('eventTools')}
            className="sticky top-0 hidden h-screen w-75 shrink-0 flex-col overflow-y-auto border-l border-border bg-background no-scrollbar lg:flex"
        >
            <div className="p-5 flex flex-col h-full">
                {panel.isHost ? <HostContextSections panel={panel} /> : <MemberActionsSection items={panel.actionItems} />}
            </div>
        </aside>
    );
}
