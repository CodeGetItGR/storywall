'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { AssetFileButton } from '@/components/saveMyDate/editor/themeAssets/AssetFileButton';
import { AssetListRow } from '@/components/saveMyDate/editor/themeAssets/AssetListRow';
import { mediaOf } from '@/components/saveMyDate/editor/themeAssets/BackgroundAssets';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

type ElementAssetsProps = { assets: ThemeAssets; design: ThemeDesign; media: MediaResolver };

// The theme's elements: pictures a section can show, like a flourish over the parents' names.
export function ElementAssets({ assets, design, media }: ElementAssetsProps) {
    const t = useTranslations('InvitationEditor');
    const { addElements } = assets;
    const add = useCallback((files: File[]) => void addElements(files), [addElements]);

    return (
        <div className="flex flex-col gap-3">
            {/* List */}
            {design.elements.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {design.elements.map((element) => (
                        <AssetListRow
                            key={element.id}
                            kind="elements"
                            id={element.id}
                            name={element.name}
                            src={mediaOf(media, element.image.mediaId)}
                            assets={assets}
                        />
                    ))}
                </ul>
            )}
            {/* Add */}
            <AssetFileButton label={t('assets.addElement')} multiple onFiles={add} disabled={assets.busy === 'elements'} />
            {assets.failed === 'elements' && <SettingsHint tone="error">{t('assets.uploadFailed')}</SettingsHint>}
        </div>
    );
}
