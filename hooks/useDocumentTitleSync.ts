import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { isEventRoute } from '@/components/layout/mobile-tab-bar';
import { useActiveEvent } from '@/providers/EventProvider';

export function useDocumentTitleSync() {
    const pathname = usePathname();
    const activeEvent = useActiveEvent();
    const eventTitle = isEventRoute(pathname) ? activeEvent?.title : undefined;

    useEffect(() => {
        if (eventTitle) {
            document.title = eventTitle;
        }
    }, [eventTitle]);
}
