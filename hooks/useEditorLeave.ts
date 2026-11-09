'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { hasInAppPrevious } from '@/lib/inAppHistory';
import { routes } from '@/lib/routes';

// The editor's back button: saves first, and asks before leaving changes that couldn't be saved.
// It goes to the previous page in the app, or home when the editor was opened from outside.
export function useEditorLeave(flush: () => Promise<boolean>) {
    const router = useRouter();
    const [isConfirming, setIsConfirming] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const leave = useCallback(() => {
        setIsConfirming(false);
        if (hasInAppPrevious()) router.back();
        else router.push(routes.home);
    }, [router]);

    const back = useCallback(async () => {
        setIsLeaving(true);
        const saved = await flush();
        setIsLeaving(false);
        if (saved) leave();
        else setIsConfirming(true);
    }, [flush, leave]);

    const stay = useCallback(() => setIsConfirming(false), []);

    return { isConfirming, isLeaving, back, leave, stay };
}
