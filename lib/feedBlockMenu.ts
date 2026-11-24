import { canHaveBackground } from '@/lib/feedSectionBackground';
import type { InvitationSection } from '@/lib/invitation/sections';

// What a block's dropdown holds in feed edit mode, in this order.
export type FeedBlockTool = 'settings' | 'photo' | 'color' | 'delete';

// A section's background: one photo or one colour.
export type FeedBackgroundKind = 'photo' | 'color';

export function feedBlockTools(
    section: Pick<InvitationSection, 'type' | 'locked'>,
    { hasSettings, canDelete }: { hasSettings: boolean; canDelete: boolean },
): FeedBlockTool[] {
    const tools: FeedBlockTool[] = [];
    if (hasSettings) tools.push('settings');
    if (canHaveBackground(section)) tools.push('photo', 'color');
    if (canDelete) tools.push('delete');
    return tools;
}
