'use client';

import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsHint, SettingsSelect } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ProgramIconGlyph } from '@/components/saveMyDate/invitation/sections/info/ProgramIconGlyph';
import { useProgramIconField } from '@/hooks/useProgramIconField';
import type { ProgramSection } from '@/hooks/useProgramItemsSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { ICON_ACCEPT } from '@/lib/invitation/programIconUpload';
import type { SectionData } from '@/lib/invitation/sectionSettings';
import type { ProgramItemPatch } from '@/lib/invitation/sectionSettingsEdits';
import { cn } from '@/lib/utils';

type ProgramIconFieldProps = {
    scope: SettingsScope<ProgramSection>;
    item: SectionData<'programIcons'>['items'][number];
    onChange: (itemId: string, patch: ProgramItemPatch) => void;
};

// A moment's icon (old program icon picker), with an upload for admins.
export function ProgramIconField({ scope, item, onChange }: ProgramIconFieldProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const id = useId();
    const fileId = useId();
    const field = useProgramIconField(scope, item, onChange);

    return (
        <div className="flex flex-col gap-1.5">
            {/* Label */}
            <label htmlFor={id} className="text-[13px] leading-tight">
                {t('icon')}
            </label>

            {/* Choice */}
            <div className="flex items-center gap-2">
                <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#2b2d31] [&_svg]:h-6 [&_svg]:w-6"
                >
                    {field.preview && <ProgramIconGlyph icon={field.preview} />}
                    {field.customSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={field.customSrc} alt={t('customIconAlt')} className="h-6 w-6 object-contain" />
                    )}
                </span>
                <SettingsSelect id={id} value={field.choice} onChange={field.onSelect}>
                    <option value="auto">{t('iconChoices.auto')}</option>
                    <option value="none">{t('iconChoices.none')}</option>
                    {field.showsCustomChoice && <option value="custom">{t('iconChoices.custom')}</option>}
                    {field.presets.map((key) => (
                        <option key={key} value={key}>
                            {t(`programIcons.${key}`)}
                        </option>
                    ))}
                </SettingsSelect>
            </div>
            {field.choice === 'auto' && <SettingsHint>{t('autoIconHint')}</SettingsHint>}

            {/* Own icon */}
            {(field.canUpload || field.showsCustomChoice) && (
                <div className="flex gap-2">
                    {field.canUpload && (
                        <label
                            htmlFor={fileId}
                            className={cn(
                                SECONDARY_BUTTON_CLASS,
                                'flex-1 cursor-pointer',
                                field.upload.isUploading && 'pointer-events-none opacity-50',
                            )}
                        >
                            <Upload aria-hidden="true" />
                            {t('uploadIcon')}
                            <input
                                id={fileId}
                                type="file"
                                accept={ICON_ACCEPT}
                                onChange={field.upload.onFile}
                                disabled={field.upload.isUploading}
                                className="sr-only"
                            />
                        </label>
                    )}
                    {field.showsCustomChoice && (
                        <button type="button" onClick={field.removeCustom} className={cn(SECONDARY_BUTTON_CLASS, 'flex-1')}>
                            {t('remove')}
                        </button>
                    )}
                </div>
            )}
            {field.upload.problem && <SettingsHint tone="error">{t(`iconErrors.${field.upload.problem}`)}</SettingsHint>}
        </div>
    );
}
