import type { QrGuestAction } from '@/lib/api/types';

export type GuestCodeView = 'chooser' | 'upload' | 'wish';

// What a scanned GUEST code opens on: the one thing it offers, or a chooser when it offers both
// (the Bundle). Null when it offers nothing, which the backend answers as TARGET_UNAVAILABLE anyway.
export function guestCodeStartView(actions: QrGuestAction[] | undefined): GuestCodeView | null {
    if (!actions || actions.length === 0) return null;
    if (actions.length > 1) return 'chooser';
    return actions[0] === 'UPLOAD' ? 'upload' : 'wish';
}
