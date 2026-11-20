import type { EventDetailResponseDto, QrLinkResolutionDto, QrLinkResponseDto } from '@/lib/api/types';
import type { DemoGuestPage } from '@/lib/demo/demoRouting';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { findGalleryQrLink } from '@/lib/qrLinks';

function activeLink(link: QrLinkResponseDto | null | undefined): QrLinkResponseDto | null {
    return link?.status === 'ACTIVE' ? link : null;
}

// What the backend would answer for a scan of the demo event's join code ('invite') or its gallery
// upload code ('upload'), built from the demo's own links. The real /q/{token} page asks the backend,
// which refuses a demo event. Comes with the scanned code's token. Null when that code isn't there or doesn't work.
export function demoQrResolution(
    event: EventDetailResponseDto,
    qrLinks: QrLinkResponseDto[],
    page: DemoGuestPage,
): { resolution: QrLinkResolutionDto; token: string } | null {
    const join = activeLink(qrLinks.find((link) => link.targetType === 'EVENT_JOIN'));
    const gallery = activeLink(findGalleryQrLink(qrLinks));
    const scanned = page === 'invite' ? join : gallery;
    if (!scanned) return null;

    // Wishes go through the join code, as on a real event, while the wishbook is in the plan.
    const wishToken = isModuleAvailable(event.modules, 'wishbook') ? (join ?? scanned).token : undefined;
    const base = {
        status: 'ACTIVE',
        eventId: event.id,
        eventTitle: event.title,
        eventSubtitle: event.subtitle,
        coverMedia: event.coverMedia,
        theme: event.theme,
        wishToken,
    } satisfies Partial<QrLinkResolutionDto>;

    const resolution: QrLinkResolutionDto =
        page === 'invite'
            ? { ...base, targetType: 'EVENT_JOIN', inviteToken: scanned.token, uploadToken: gallery?.token }
            : { ...base, targetType: 'MEDIA_UPLOAD', guestActions: ['UPLOAD'], joinInviteToken: join?.token };
    return { resolution, token: scanned.token };
}

// The demo notice above each view of the QR page. The wish form has none.
export function demoQrNoticeKey(view: 'chooser' | 'upload' | 'wish' | null): 'inviteNotice' | 'uploadNotice' | null {
    if (view === 'chooser') return 'inviteNotice';
    if (view === 'upload') return 'uploadNotice';
    return null;
}
