// What a block's dropdown holds in feed edit mode, in this order.
export type FeedBlockTool = 'settings' | 'delete';

export function feedBlockTools({ hasSettings, canDelete }: { hasSettings: boolean; canDelete: boolean }): FeedBlockTool[] {
    const tools: FeedBlockTool[] = [];
    if (hasSettings) tools.push('settings');
    if (canDelete) tools.push('delete');
    return tools;
}
