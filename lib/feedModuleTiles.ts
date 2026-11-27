import type { EventModuleResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import type { FeatureAddonOffer } from '@/lib/featureAddons';
import { layoutHasModule, type TileModuleKey } from '@/lib/feedModuleBlocks';
import type { InvitationDocument } from '@/lib/invitation/document';

// The Premium tiles, one per guest-facing module, in the owner's order (spec item 15). No tiles for posts, stories,
// co-hosts, guest roles, theme, Save my date or QR cards.
export const PREMIUM_TILE_MODULES = [
    'rsvp',
    'wishbook',
    'playlist',
    'he_or_she',
    'quiz_polls',
    'schedule',
    'wishlist',
    'gallery',
] as const satisfies readonly TileModuleKey[];

// One row shows; the down arrow shows the rest.
export const VISIBLE_TILES = 4;

export type PremiumTile = { module: TileModuleKey; action: 'add' } | { module: TileModuleKey; action: 'buy'; addonCode: string };

// A saved typed schedule: a page holds one schedule only (KAN-293), so the Schedule tile stays away while one is there.
const TYPED_SCHEDULES: ReadonlySet<string> = new Set(['program', 'programIcons']);

function hasTypedSchedule(document: InvitationDocument): boolean {
    return document.sections.some((section) => TYPED_SCHEDULES.has(section.type));
}

// A tile adds its block when the event has the module, opens the add-on when the plan sells it, else is left out. A
// tile whose block is already on the layout is left out too (Open question 5), and so is the Schedule tile while the
// page holds a typed schedule. canAdd: the page has room.
export function premiumTiles({
    document,
    modules,
    offers,
    canAdd,
}: {
    document: InvitationDocument;
    modules: readonly EventModuleResponseDto[];
    offers: readonly FeatureAddonOffer[];
    canAdd: boolean;
}): PremiumTile[] {
    return PREMIUM_TILE_MODULES.flatMap((module): PremiumTile[] => {
        if (module === 'schedule' && hasTypedSchedule(document)) return [];
        if (isModuleAvailable([...modules], module)) return canAdd && !layoutHasModule(document, module) ? [{ module, action: 'add' }] : [];
        const sold = offers.find((item) => item.service.grantsModuleKey === module);
        return sold ? [{ module, action: 'buy', addonCode: sold.service.code }] : [];
    });
}
