'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { AssetSlot } from '@/components/saveMyDate/editor/themeAssets/AssetSlot';
import { mediaOf } from '@/components/saveMyDate/editor/themeAssets/BackgroundAssets';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { ART_SLOTS, type ArtSlot } from '@/lib/invitation/themeAssets';

type IllustrationAssetsProps = { assets: ThemeAssets; design: ThemeDesign; media: MediaResolver };

// The theme's main illustration and its three place icons.
export function IllustrationAssets({ assets, design, media }: IllustrationAssetsProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <SettingsGroup>
            {ART_SLOTS.map((slot) => (
                <ArtSlotField
                    key={slot}
                    slot={slot}
                    label={t(`assets.art.${slot}`)}
                    src={mediaOf(media, design.art[slot]?.image.mediaId)}
                    assets={assets}
                />
            ))}
        </SettingsGroup>
    );
}

type ArtSlotFieldProps = { slot: ArtSlot; label: string; src?: string; assets: ThemeAssets };

function ArtSlotField({ slot, label, src, assets }: ArtSlotFieldProps) {
    const { setArt } = assets;
    const key = `art.${slot}`;
    const change = useCallback((file: File | null) => void setArt(slot, file), [setArt, slot]);
    return <AssetSlot label={label} src={src} onFile={change} isBusy={assets.busy === key} hasFailed={assets.failed === key} />;
}
