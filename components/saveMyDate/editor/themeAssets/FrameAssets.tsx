'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsGroup, SettingsHint, SettingsInput } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { AssetListRow } from '@/components/saveMyDate/editor/themeAssets/AssetListRow';
import { mediaOf } from '@/components/saveMyDate/editor/themeAssets/BackgroundAssets';
import { DraftFileField } from '@/components/saveMyDate/editor/themeAssets/DraftFileField';
import { useFrameDraft } from '@/hooks/useThemeAssetDraft';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

type FrameAssetsProps = { assets: ThemeAssets; design: ThemeDesign; media: MediaResolver };

// The theme's photo frames, and a new one put together from its art and its mask.
export function FrameAssets({ assets, design, media }: FrameAssetsProps) {
    const t = useTranslations('InvitationEditor');
    const draft = useFrameDraft(assets.addFrame);
    const { submit } = draft;
    const add = useCallback(() => void submit(), [submit]);

    return (
        <div className="flex flex-col gap-6">
            {/* List */}
            {design.frames.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {design.frames.map((frame) => (
                        <AssetListRow
                            key={frame.id}
                            kind="frames"
                            id={frame.id}
                            name={frame.name}
                            src={mediaOf(media, frame.art.mediaId)}
                            assets={assets}
                        />
                    ))}
                </ul>
            )}

            {/* New frame */}
            <SettingsGroup title={t('assets.addFrame')}>
                <SettingsInput
                    aria-label={t('assets.name')}
                    placeholder={t('assets.name')}
                    value={draft.name}
                    maxLength={300}
                    onChange={draft.changeName}
                />
                <DraftFileField fileKey="art" label={t('assets.frameArt')} src={draft.previews.art} onPick={draft.pick} disabled={draft.isAdding} />
                <DraftFileField fileKey="mask" label={t('assets.mask')} src={draft.previews.mask} onPick={draft.pick} disabled={draft.isAdding} />
                <button type="button" onClick={add} disabled={!draft.canAdd} className={SECONDARY_BUTTON_CLASS}>
                    <Plus aria-hidden="true" />
                    {t('assets.addFrame')}
                </button>
                {assets.failed === 'frames' && <SettingsHint tone="error">{t('assets.uploadFailed')}</SettingsHint>}
            </SettingsGroup>
        </div>
    );
}
