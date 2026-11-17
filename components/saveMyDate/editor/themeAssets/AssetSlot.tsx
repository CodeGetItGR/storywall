'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { AssetFileButton } from '@/components/saveMyDate/editor/themeAssets/AssetFileButton';
import { cn } from '@/lib/utils';

type AssetSlotProps = {
    label: string;
    // The preview's alt text, when the label alone doesn't say which image it is.
    alt?: string;
    // The image's address, when the slot has one.
    src?: string;
    onFile: (file: File | null) => void;
    // Leave out when the image can't be taken away on its own.
    canRemove?: boolean;
    isBusy?: boolean;
    hasFailed?: boolean;
};

// One place for a theme image: its preview, upload or replace, and remove.
export function AssetSlot({ label, alt, src, onFile, canRemove = true, isBusy = false, hasFailed = false }: AssetSlotProps) {
    const t = useTranslations('InvitationEditor');
    const pick = useCallback((files: File[]) => onFile(files[0] ?? null), [onFile]);
    const remove = useCallback(() => onFile(null), [onFile]);

    return (
        <div className="flex flex-col gap-2">
            <span className="text-[13px] leading-tight">{label}</span>
            <div className="flex items-center gap-2">
                {/* Preview */}
                {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={alt ?? label} className="h-10 w-10 shrink-0 rounded-lg bg-white/10 object-contain" />
                )}
                {/* Actions */}
                <AssetFileButton label={src ? t('assets.replace') : t('assets.upload')} onFiles={pick} disabled={isBusy} className="flex-1" />
                {src && canRemove && (
                    <button type="button" onClick={remove} disabled={isBusy} className={cn(SECONDARY_BUTTON_CLASS, 'flex-1')}>
                        {t('sectionSettings.remove')}
                    </button>
                )}
            </div>
            {hasFailed && <SettingsHint tone="error">{t('assets.uploadFailed')}</SettingsHint>}
        </div>
    );
}
