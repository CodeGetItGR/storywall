import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';

export type AnnouncementBlock = 'readOnly' | 'moduleUnavailable';

// An announcement is a post, so it needs a live event and the posts module (the backend's requireAvailable).
export function announcementBlock(event: Pick<EventDetailResponseDto, 'status' | 'modules'> | null | undefined): AnnouncementBlock | null {
    if (!event) return null;
    if (!isEventWritable(event.status)) return 'readOnly';
    if (!isModuleAvailable(event.modules, 'posts')) return 'moduleUnavailable';
    return null;
}
