'use client';

import { useCallback, useState } from 'react';

import type { QrGuestAction } from '@/lib/api/types';
import { guestCodeStartView,type GuestCodeView } from '@/lib/qrGuestCode';

// The open view on a guest code's page. Only a code with a chooser has somewhere to go back to.
export function useGuestCodeScreen(actions: QrGuestAction[]) {
    const startView = guestCodeStartView(actions);
    const [view, setView] = useState<GuestCodeView | null>(startView);

    const open = useCallback((next: 'upload' | 'wish') => setView(next), []);
    const back = useCallback(() => setView('chooser'), []);

    return { view, open, back, canGoBack: startView === 'chooser' && view !== 'chooser' };
}
