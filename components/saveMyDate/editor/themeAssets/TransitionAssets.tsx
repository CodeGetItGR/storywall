'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsGroup, SettingsHint, SettingsInput } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { AssetListRow } from '@/components/saveMyDate/editor/themeAssets/AssetListRow';
import { mediaOf } from '@/components/saveMyDate/editor/themeAssets/BackgroundAssets';
import { DraftFileField } from '@/components/saveMyDate/editor/themeAssets/DraftFileField';
import { useTransitionDraft } from '@/hooks/useThemeAssetDraft';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

type TransitionAssetsProps = { assets: ThemeAssets; design: ThemeDesign; media: MediaResolver };

// The theme's transitions between sections, and a new one from its desktop and mobile images.
export function TransitionAssets({ assets, design, media }: TransitionAssetsProps) {
    const t = useTranslations('InvitationEditor');
    const draft = useTransitionDraft(assets.addTransition);
    const { submit } = draft;
    const add = useCallback(() => void submit(), [submit]);

    return (
        <div className="flex flex-col gap-6">
            {/* List */}
            {design.transitions.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {design.transitions.map((transition) => (
                        <AssetListRow
                            key={transition.id}
                            kind="transitions"
                            id={transition.id}
                            name={transition.name}
                            src={mediaOf(media, transition.desktop.mediaId)}
                            assets={assets}
                        />
                    ))}
                </ul>
            )}

            {/* New transition */}
            <SettingsGroup title={t('assets.addTransition')}>
                <SettingsInput
                    aria-label={t('assets.name')}
                    placeholder={t('assets.name')}
                    value={draft.name}
                    maxLength={300}
                    onChange={draft.changeName}
                />
                <DraftFileField
                    fileKey="desktop"
                    label={t('previewDesktop')}
                    src={draft.previews.desktop}
                    onPick={draft.pick}
                    disabled={draft.isAdding}
                />
                <DraftFileField
                    fileKey="mobile"
                    label={t('previewMobile')}
                    src={draft.previews.mobile}
                    onPick={draft.pick}
                    disabled={draft.isAdding}
                />
                <button type="button" onClick={add} disabled={!draft.canAdd} className={SECONDARY_BUTTON_CLASS}>
                    <Plus aria-hidden="true" />
                    {t('assets.addTransition')}
                </button>
                {assets.failed === 'transitions' && <SettingsHint tone="error">{t('assets.uploadFailed')}</SettingsHint>}
            </SettingsGroup>
        </div>
    );
}
