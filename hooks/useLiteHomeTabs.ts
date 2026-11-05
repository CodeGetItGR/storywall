'use client';

import { BookHeart, Images } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { SubTabItem } from '@/components/ui/SubTabs';
import type { LiteHomeTabsState } from '@/hooks/useLiteHome';
import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
import type { LiteHomeModule } from '@/lib/liteEvents';

// A Bundle's Gallery / Wishbook tabs. Each tab is its own page, so picking one navigates.
export function useLiteHomeTabs(tabs: LiteHomeTabsState) {
    const router = useRouter();
    const galleryName = useActiveModuleCopy('gallery').name;
    const wishbookName = useActiveModuleCopy('wishbook').name;
    const items: SubTabItem<LiteHomeModule>[] = [
        { key: 'gallery', label: galleryName, icon: Images },
        { key: 'wishbook', label: wishbookName, icon: BookHeart },
    ];
    const select = useCallback(
        (key: LiteHomeModule) => {
            if (key !== tabs.active) router.push(tabs.hrefs[key]);
        },
        [router, tabs],
    );

    return { items, select };
}
