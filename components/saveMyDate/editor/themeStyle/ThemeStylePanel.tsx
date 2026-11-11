'use client';

import { useTranslations } from 'next-intl';

import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ThemeBackgroundRow } from '@/components/saveMyDate/editor/themeStyle/ThemeBackgroundRow';
import { ThemeColorRow } from '@/components/saveMyDate/editor/themeStyle/ThemeColorRow';
import { ThemeSelectRow } from '@/components/saveMyDate/editor/themeStyle/ThemeSelectRow';
import { ThemeToggleRow } from '@/components/saveMyDate/editor/themeStyle/ThemeToggleRow';
import type { ThemeStyle } from '@/hooks/useThemeStyle';
import { useThemeStyleControls } from '@/hooks/useThemeStyleControls';
import { THEME_BACKGROUND_SLOTS } from '@/lib/invitation/sectionStyle';

// The theme's style in the admin's theme editor: colours, backgrounds, fonts, photo shape and buttons.
export function ThemeStylePanel({ style }: { style: ThemeStyle }) {
    const t = useTranslations('InvitationEditor');
    const controls = useThemeStyleControls(style);
    const { design } = style;

    return (
        <div className="flex flex-col gap-6">
            {/* Colours */}
            <SettingsGroup>
                <ThemeColorRow label={t('themeStyle.mainColor')} value={design.colors.primary} onChange={controls.setPrimary} />
                <ThemeColorRow label={t('themeStyle.secondColor')} value={design.colors.secondary} onChange={controls.setSecondary} />
                <ThemeColorRow label={t('textColor')} value={design.colors.text} onChange={controls.setText} />
                <ThemeToggleRow label={t('themeStyle.autoContrast')} checked={design.autoTextContrast} onChange={style.setAutoContrast} />
            </SettingsGroup>

            {/* Backgrounds */}
            <SettingsGroup title={t('themeStyle.backgrounds')}>
                {THEME_BACKGROUND_SLOTS.map((slot, index) => (
                    <ThemeBackgroundRow
                        key={slot}
                        slot={slot}
                        number={index + 1}
                        mode={design.backgrounds[slot].mode}
                        stableRepeat={design.backgrounds[slot].stableRepeat}
                        onMode={style.setBackgroundMode}
                        onStableRepeat={style.setStableRepeat}
                    />
                ))}
            </SettingsGroup>

            {/* Fonts */}
            <SettingsGroup title={t('themeStyle.fonts')}>
                <ThemeSelectRow label={t('themeStyle.fontStyle')} value={style.presetId} options={controls.presetOptions} onChange={style.choosePreset} />
                <ThemeSelectRow label={t('sectionSettings.titleFont')} value={style.fontValues.title} options={controls.fontOptions} onChange={controls.setTitleFont} />
                <ThemeSelectRow label={t('themeStyle.bodyFont')} value={style.fontValues.body} options={controls.fontOptions} onChange={controls.setBodyFont} />
            </SettingsGroup>

            {/* Photos */}
            <SettingsGroup>
                <ThemeSelectRow label={t('themeStyle.photoShape')} value={design.photoShape} options={controls.shapeOptions} onChange={controls.setPhotoShape} />
            </SettingsGroup>

            {/* Buttons */}
            <SettingsGroup title={t('themeStyle.buttons')}>
                <ThemeColorRow
                    label={t('themeStyle.buttonFill')}
                    value={style.buttonBgShown}
                    onChange={controls.setButtonBg}
                    onReset={design.colors.buttonBg ? controls.resetButtonBg : undefined}
                />
                <ThemeColorRow
                    label={t('themeStyle.buttonText')}
                    value={style.buttonTextShown}
                    onChange={controls.setButtonText}
                    onReset={design.colors.buttonText ? controls.resetButtonText : undefined}
                />
                <ThemeSelectRow
                    label={t('themeStyle.buttonFont')}
                    value={style.fontValues.button}
                    options={controls.buttonFontOptions}
                    onChange={controls.setButtonFont}
                />
            </SettingsGroup>
        </div>
    );
}
