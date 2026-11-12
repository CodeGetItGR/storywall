'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsInput } from '@/components/saveMyDate/editor/settings/SettingsControls';
import type { ThemeAssets } from '@/hooks/useThemeAssets';
import type { ThemeListKind } from '@/lib/invitation/themeAssets';

type AssetListRowProps = { kind: ThemeListKind; id: string; name: string; src?: string; assets: ThemeAssets };

// One element, frame or transition: its picture, its name and a way to take it out.
export function AssetListRow({ kind, id, name, src, assets }: AssetListRowProps) {
    const t = useTranslations('InvitationEditor');
    const { rename, remove } = assets;
    const changeName = useCallback((event: ChangeEvent<HTMLInputElement>) => rename(kind, id, event.target.value), [id, kind, rename]);
    const removeItem = useCallback(() => remove(kind, id), [id, kind, remove]);

    return (
        <li className="flex items-center gap-2">
            {/* Preview */}
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name || t(`assets.tabs.${kind}`)} className="h-10 w-10 shrink-0 rounded-lg bg-white/10 object-contain" />
            ) : (
                <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg bg-white/10" />
            )}
            {/* Name */}
            <SettingsInput aria-label={t('assets.name')} value={name} maxLength={300} onChange={changeName} />
            {/* Remove */}
            <button type="button" onClick={removeItem} className={SECONDARY_BUTTON_CLASS}>
                {t('sectionSettings.remove')}
            </button>
        </li>
    );
}
