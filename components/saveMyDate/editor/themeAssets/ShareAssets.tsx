'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { AssetSlot } from '@/components/saveMyDate/editor/themeAssets/AssetSlot';
import { mediaOf } from '@/components/saveMyDate/editor/themeAssets/BackgroundAssets';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { ThemeShare } from '@/lib/invitation/editorStore';
import type { MediaResolver } from '@/lib/invitation/render';

type ShareAssetsProps = { assets: ThemeAssets; share: ThemeShare; media: MediaResolver };

// The image a shared link to the theme shows.
export function ShareAssets({ assets, share, media }: ShareAssetsProps) {
    const t = useTranslations('InvitationEditor');
    const { setShare } = assets;
    const change = useCallback((file: File | null) => void setShare(file), [setShare]);

    return (
        <AssetSlot
            label={t('assets.tabs.share')}
            src={mediaOf(media, share.imageId)}
            onFile={change}
            isBusy={assets.busy === 'share'}
            hasFailed={assets.failed === 'share'}
        />
    );
}
