import type { EventStatus } from '@/lib/api/types';

export function isEventWritable(status: EventStatus | null | undefined): boolean {
    return status === 'ACTIVE';
}
