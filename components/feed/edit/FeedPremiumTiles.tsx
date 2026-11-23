'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventTypeConvention } from '@/lib/api/types';
import type { TileModuleKey } from '@/lib/feedModuleBlocks';
import { type PremiumTile, VISIBLE_TILES } from '@/lib/feedModuleTiles';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type FeedPremiumTilesProps = { tiles: PremiumTile[]; eventId: string; eventType: EventTypeConvention; onAdd: (module: TileModuleKey) => void };

// On a phone a tile is about 70 px wide: the label is a size smaller with little side padding, so names like "Λογαριασμός"
// fit whole. A longer name wraps inside the tile, hyphenated where the browser can.
const TILE =
    'flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-muted px-0.5 text-center text-[10.5px] leading-tight text-ink hyphens-auto [overflow-wrap:anywhere] hover:bg-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none sm:px-1 sm:text-[12px]';

// The Add section sheet's Premium tiles (spec item 15): one row of four, the down arrow shows the rest. A tile adds
// its module's block, or opens the add-on's purchase.
export function FeedPremiumTiles({ tiles, eventId, eventType, onAdd }: FeedPremiumTilesProps) {
    const t = useTranslations('FeedEditor');
    const copy = useModuleCopy(eventType);
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen((current) => !current), []);
    const shown = open ? tiles : tiles.slice(0, VISIBLE_TILES);
    const arrowLabel = open ? t('premiumLess') : t('premiumMore');

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Tiles */}
            <ul className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
                {shown.map((tile) => (
                    <li key={tile.module}>
                        <PremiumTileButton tile={tile} name={copy(tile.module).name} eventId={eventId} onAdd={onAdd} />
                    </li>
                ))}
            </ul>

            {/* The rest */}
            {tiles.length > VISIBLE_TILES && (
                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-label={arrowLabel}
                    title={arrowLabel}
                    className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

type PremiumTileButtonProps = { tile: PremiumTile; name: string; eventId: string; onAdd: (module: TileModuleKey) => void };

// One tile: its icon and name. The label is the name, so the icon's alt isn't read twice.
function PremiumTileButton({ tile, name, eventId, onAdd }: PremiumTileButtonProps) {
    const add = useCallback(() => onAdd(tile.module), [onAdd, tile.module]);
    const content = (
        <>
            <Image src={`/icons/modules/${tile.module}.svg`} alt={name} width={26} height={26} className="h-6.5 w-6.5" unoptimized />
            <span aria-hidden="true">{name}</span>
        </>
    );

    return tile.action === 'add' ? (
        <button type="button" onClick={add} aria-label={name} className={TILE}>
            {content}
        </button>
    ) : (
        <AppLink href={routes.events.settingsAddons(eventId, { add: tile.addonCode })} aria-label={name} className={TILE}>
            {content}
        </AppLink>
    );
}
