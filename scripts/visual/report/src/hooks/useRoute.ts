import { useMemo, useSyncExternalStore } from 'react';

import { goToItem, itemFromHash } from '../lib/addresses';
import type { ReportModel } from '../lib/model';
import type { Item } from '../lib/reviewOrder';

export type Route = { item: Item; go: (item: Item) => void };

function subscribe(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => window.location.hash;

// The address holds the current item, so links and the back button just work.
export function useRoute(model: ReportModel): Route {
    const hash = useSyncExternalStore(subscribe, readHash);
    const item = useMemo(() => itemFromHash(hash, model), [hash, model]);
    return { item, go: goToItem };
}
