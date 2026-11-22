// The Overview's invitation to customize the feed (KAN-245). 'locked': the event has no Save my date and the
// main host can buy it now; 'included': it has Save my date, so hosts can start editing. Any event type: one
// without Save my date themes still gets edit mode.
export type FeedEditBannerState = 'locked' | 'included' | null;

export type FeedEditBannerInput = {
    // The feed editor is released here (FEED_EDITOR_LAUNCHED).
    flag: boolean;
    // The save_my_date module is available on the event.
    saveMyDate: boolean;
    // The event can be changed (isEventWritable).
    writable: boolean;
    // The event's plan sells the Save my date add-on.
    offered: boolean;
    // A live event: add-ons are bought on their own (featureAddonMode 'checkout').
    checkout: boolean;
    // The viewer may buy: the main host, not the demo, not incident mode.
    canBuy: boolean;
    // A withdrawal under review pauses purchases.
    paused: boolean;
};

export function feedEditBannerState(input: FeedEditBannerInput): FeedEditBannerState {
    if (!input.flag) return null;
    if (input.saveMyDate) return input.writable ? 'included' : null;
    return input.offered && input.checkout && input.canBuy && !input.paused ? 'locked' : null;
}
