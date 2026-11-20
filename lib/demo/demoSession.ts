import type { DemoSnapshotDto, EventUsageResponseDto, QrCardTemplateDto, WishbookBookDto } from '@/lib/api/types';
import { createDemoDb, type DemoDb } from '@/lib/demo/demoDb';

// One visitor's demo of one event type. The visitor is the event's primary host.
export interface DemoSession {
    eventTypeKey: string;
    eventId: string;
    viewerUserId: string;
    viewerMemberId: string;
    usage: EventUsageResponseDto;
    // Display name of usage.planTier, from /api/config → planTiers[]. Falls back to the code.
    planTierName: string;
    // The event's QR card designs. Empty when it has none, or when the backend doesn't send them yet.
    qrCardTemplates: QrCardTemplateDto[];
    // The event's own keepsake book, or null when it has none: what the demo's book panel hands out.
    wishbookBook: WishbookBookDto | null;
    db: DemoDb;
}

// `snapshot` must already be rebased (see snapshotRebase.ts); `contentVersion` is taken before that.
export function createDemoSession(eventTypeKey: string, snapshot: DemoSnapshotDto, contentVersion: string, planTierName: string | null): DemoSession {
    return {
        eventTypeKey,
        eventId: snapshot.event.id,
        viewerUserId: snapshot.viewerUserId,
        viewerMemberId: snapshot.viewerMemberId,
        usage: snapshot.usage,
        planTierName: planTierName ?? snapshot.usage.planTier,
        qrCardTemplates: snapshot.qrCardTemplates ?? [],
        wishbookBook: snapshot.wishbookBook ?? null,
        db: createDemoDb(eventTypeKey, snapshot, contentVersion),
    };
}

// The book's download link is presigned like the media URLs, so it is swapped with them when the
// snapshot is fetched again. The QR cards' artwork is served from our own origin and never expires.
export function swapSnapshotLinks(session: DemoSession, snapshot: DemoSnapshotDto): void {
    session.wishbookBook = snapshot.wishbookBook ?? null;
}
