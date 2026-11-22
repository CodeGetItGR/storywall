'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isFeedEditRequest, withoutEditParam } from '@/lib/feedEditLink';
import { replacePageUrl } from '@/lib/overlayHistory';

type FeedEditTrigger = { settled: boolean; canEdit: boolean; start: () => void };

// Starts edit mode for ?edit=blocks. The param is replaced away first and edit mode starts only once it's
// gone, so Back never lands on a URL that reopens it, and no server render happens. It waits for the role and
// the layout, so a guest's link is just dropped.
export function useFeedEditTrigger({ settled, canEdit, start }: FeedEditTrigger) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requested = isFeedEditRequest(searchParams);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!requested || !settled) return;
        replacePageUrl(withoutEditParam(pathname, searchParams.toString()));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The trigger param is consumed once; edit mode starts after it leaves the URL.
        if (canEdit) setPending(true);
    }, [canEdit, pathname, requested, searchParams, settled]);

    useEffect(() => {
        if (!pending || requested) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts only once the trigger param is gone.
        setPending(false);
        start();
    }, [pending, requested, start]);
}
