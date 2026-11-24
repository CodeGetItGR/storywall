import { KEEPS_SAVED_HEIGHT } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// A block's tools end 44 px down (FeedBlockTools). While editing, its content starts 28 px below them.
export const FEED_TOOLS_ROOM = 72;

// The top padding of a Save my date section while editing: room for its tools, or its own padding when that is more.
export function sectionToolsPadding({ type, style }: Pick<InvitationSection, 'type' | 'style'>): string {
    const saved = KEEPS_SAVED_HEIGHT.has(type) ? style.paddingY : undefined;
    return `${Math.max(FEED_TOOLS_ROOM, saved ?? 0)}px`;
}
