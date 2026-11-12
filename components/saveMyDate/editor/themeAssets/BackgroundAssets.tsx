'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { AssetSlot } from '@/components/saveMyDate/editor/themeAssets/AssetSlot';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { MediaResolver } from '@/lib/invitation/render';
import { THEME_BACKGROUND_SLOTS } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { BackgroundDevice } from '@/lib/invitation/themeAssets';
import type { BackgroundSlot } from '@/lib/invitation/themeEditing';

type BackgroundAssetsProps = { assets: ThemeAssets; design: ThemeDesign; media: MediaResolver };

const DEVICES: readonly BackgroundDevice[] = ['desktop', 'mobile'];

// The theme's three backgrounds, each with a desktop and a mobile image.
export function BackgroundAssets({ assets, design, media }: BackgroundAssetsProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <div className="flex flex-col gap-6">
            {THEME_BACKGROUND_SLOTS.map((slot, index) => (
                // Background
                <SettingsGroup key={slot} title={t('sectionSettings.backgroundNumber', { n: index + 1 })}>
                    {DEVICES.map((device) => (
                        <BackgroundSlotField
                            key={device}
                            slot={slot}
                            device={device}
                            label={t(device === 'desktop' ? 'previewDesktop' : 'previewMobile')}
                            alt={`${t('sectionSettings.backgroundNumber', { n: index + 1 })} · ${t(device === 'desktop' ? 'previewDesktop' : 'previewMobile')}`}
                            src={mediaOf(media, design.backgrounds[slot][device]?.mediaId)}
                            assets={assets}
                        />
                    ))}
                </SettingsGroup>
            ))}
        </div>
    );
}

type BackgroundSlotFieldProps = { slot: BackgroundSlot; device: BackgroundDevice; label: string; alt: string; src?: string; assets: ThemeAssets };

function BackgroundSlotField({ slot, device, label, alt, src, assets }: BackgroundSlotFieldProps) {
    const { setBackground } = assets;
    const key = `background.${slot}.${device}`;
    const change = useCallback((file: File | null) => void setBackground(slot, device, file), [device, setBackground, slot]);
    return <AssetSlot label={label} alt={alt} src={src} onFile={change} isBusy={assets.busy === key} hasFailed={assets.failed === key} />;
}

export function mediaOf(media: MediaResolver, mediaId: string | null | undefined): string | undefined {
    return mediaId ? media(mediaId) : undefined;
}
