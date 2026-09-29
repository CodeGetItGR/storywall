import type { DemoSnapshotDto, EventUsageResponseDto } from '@/lib/api/types';
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
    db: DemoDb;
}

// `snapshot` must already be rebased (see snapshotRebase.ts).
export function createDemoSession(eventTypeKey: string, snapshot: DemoSnapshotDto, planTierName: string | null): DemoSession {
    return {
        eventTypeKey,
        eventId: snapshot.event.id,
        viewerUserId: snapshot.viewerUserId,
        viewerMemberId: snapshot.viewerMemberId,
        usage: snapshot.usage,
        planTierName: planTierName ?? snapshot.usage.planTier,
        db: createDemoDb(eventTypeKey, snapshot),
    };
}
