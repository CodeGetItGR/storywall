'use client';

import { useTranslations } from 'next-intl';

import { HostContextSections } from '@/components/layout/right-context-panel/HostContextSections';
import { useRightContextPanel } from '@/hooks/useRightContextPanel';

export function RightContextPanel() {
    const t = useTranslations('RightContextPanel');
    const panel = useRightContextPanel();

    if (!panel.visible || !panel.activeEvent) return null;

    return (
        <aside
            aria-label={t('hostConsole')}
            className="sticky top-0 hidden h-screen w-75 shrink-0 flex-col overflow-y-auto border-l border-border bg-background no-scrollbar xl:flex"
        >
            <div className="p-5">
                <HostContextSections panel={panel} />
            </div>
        </aside>
    );
}
