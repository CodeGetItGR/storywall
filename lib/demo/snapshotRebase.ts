import type { DemoSnapshotDto } from '@/lib/api/types';

// Full ISO-8601 date-times only (what Spring serializes Instants as). Plain dates ("2026-10-01")
// are left alone — they name a calendar day, not a moment that should drift with "now".
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

// These two describe the snapshot itself, not the demo event, so they keep their real values:
// snapshotAt is the anchor, and presignedUrlsValidUntil is a real deadline for the media URLs.
const ABSOLUTE_KEYS = new Set(['snapshotAt', 'presignedUrlsValidUntil']);

function shiftValue(value: unknown, offsetMs: number): unknown {
    if (typeof value === 'string') {
        if (!ISO_DATE_TIME.test(value)) return value;
        const time = Date.parse(value);
        return Number.isNaN(time) ? value : new Date(time + offsetMs).toISOString();
    }
    if (Array.isArray(value)) return value.map((item) => shiftValue(item, offsetMs));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shiftValue(item, offsetMs)]));
    }
    return value;
}

// Moves every timestamp in the snapshot by (now - snapshotAt), so a post made "2 hours before
// the snapshot" reads as 2 hours ago for the visitor, and stories are as fresh as they were.
export function rebaseSnapshot(snapshot: DemoSnapshotDto, now: Date = new Date()): DemoSnapshotDto {
    const anchor = Date.parse(snapshot.snapshotAt);
    if (Number.isNaN(anchor)) return snapshot;
    const offsetMs = now.getTime() - anchor;

    const rebased = Object.fromEntries(
        Object.entries(snapshot).map(([key, value]) => [key, ABSOLUTE_KEYS.has(key) ? value : shiftValue(value, offsetMs)]),
    );
    return rebased as unknown as DemoSnapshotDto;
}
