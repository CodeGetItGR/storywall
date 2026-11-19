import type { EventCapabilitiesDto, QrGuestAction } from '@/lib/api/types';

type ModuleState = { moduleKey: string; isEnabled: boolean; isAvailable?: boolean; configuration?: Record<string, unknown> | null };

// What the backend sends as an event's capabilities for these modules (EventCapabilities.java): what it paid for
// (isEnabled) decides the kind and home, what a guest can do right now (isAvailable) the guest code's actions.
export function capabilitiesOf(modules: readonly ModuleState[], hasSchedule = true): EventCapabilitiesDto {
    const paid = (key: string) => modules.some((module_) => module_.moduleKey === key && module_.isEnabled);
    const available = (key: string) => modules.some((module_) => module_.moduleKey === key && (module_.isAvailable ?? module_.isEnabled));
    const takesGuests = paid('posts');
    const actions: QrGuestAction[] = [];
    if (!takesGuests) {
        const qrUploads = modules.some((module_) => module_.moduleKey === 'gallery' && module_.configuration?.qrUploadEnabled === true);
        if (available('gallery') && qrUploads) actions.push('UPLOAD');
        if (available('wishbook')) actions.push('WISH');
    }
    return {
        kind: takesGuests ? 'FULL' : 'LITE',
        home: takesGuests ? 'FEED' : paid('gallery') ? 'GALLERY' : paid('wishbook') ? 'WISHBOOK' : 'MANAGE',
        takesGuests,
        hasSchedule,
        showsDetailsSettings: takesGuests,
        showsShareLinks: takesGuests,
        showsGuestCode: actions.length > 0,
        guestCodeActions: actions,
    };
}
