'use client';

import { useTranslations } from 'next-intl';

import { SubTabs } from '@/components/ui/SubTabs';
import type { LiteHomeTabsState } from '@/hooks/useLiteHome';
import { useLiteHomeTabs } from '@/hooks/useLiteHomeTabs';

// A Bundle's Gallery / Wishbook tabs.
export function LiteHomeTabs({ tabs }: { tabs: LiteHomeTabsState }) {
    const t = useTranslations('LiteHome');
    const { items, select } = useLiteHomeTabs(tabs);

    return (
        <nav aria-label={t('tabsLabel')} className="mt-4">
            <SubTabs tabs={items} active={tabs.active} onSelectAction={select} />
        </nav>
    );
}
