'use client';

import { AssetTabs } from '@/components/saveMyDate/editor/themeAssets/AssetTabs';
import { BackgroundAssets } from '@/components/saveMyDate/editor/themeAssets/BackgroundAssets';
import { ElementAssets } from '@/components/saveMyDate/editor/themeAssets/ElementAssets';
import { FrameAssets } from '@/components/saveMyDate/editor/themeAssets/FrameAssets';
import { IllustrationAssets } from '@/components/saveMyDate/editor/themeAssets/IllustrationAssets';
import { ShareAssets } from '@/components/saveMyDate/editor/themeAssets/ShareAssets';
import { TransitionAssets } from '@/components/saveMyDate/editor/themeAssets/TransitionAssets';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import { useThemeAssetTab } from '@/hooks/useThemeAssetTab';
import type { ThemeShare } from '@/lib/invitation/editorStore';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

type ThemeAssetLibraryProps = { assets: ThemeAssets; design: ThemeDesign; share: ThemeShare; media: MediaResolver };

// Every image of the theme in the admin's theme editor, a kind per tab.
export function ThemeAssetLibrary({ assets, design, share, media }: ThemeAssetLibraryProps) {
    const { tab, setTab } = useThemeAssetTab();

    return (
        <div className="flex flex-col gap-5">
            {/* Tabs */}
            <AssetTabs tab={tab} onTab={setTab} />

            {/* Content */}
            {tab === 'backgrounds' && <BackgroundAssets assets={assets} design={design} media={media} />}
            {tab === 'illustrations' && <IllustrationAssets assets={assets} design={design} media={media} />}
            {tab === 'elements' && <ElementAssets assets={assets} design={design} media={media} />}
            {tab === 'frames' && <FrameAssets assets={assets} design={design} media={media} />}
            {tab === 'transitions' && <TransitionAssets assets={assets} design={design} media={media} />}
            {tab === 'share' && <ShareAssets assets={assets} share={share} media={media} />}
        </div>
    );
}
