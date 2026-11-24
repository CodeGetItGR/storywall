'use client';

import { useTranslations } from 'next-intl';

import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { StyleFields } from '@/components/saveMyDate/editor/settings/StyleFields';
import { useFooterSettings } from '@/hooks/useFooterSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { FOOTER_STYLE_FIELDS } from '@/lib/invitation/sectionStyleFields';
import { themeColors } from '@/lib/invitation/textEditing';

// Admin: the footer's link and text style (old footer panel).
export function FooterSettings({ scope }: { scope: SettingsScope<SectionOf<'footer'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const footer = useFooterSettings(scope);

    return (
        <>
            {/* Link */}
            <SettingsGroup>
                <SettingsTextField label={t('link')} value={footer.link} onSave={footer.setLink} isLink />
            </SettingsGroup>

            {/* Style */}
            <StyleFields
                groups={FOOTER_STYLE_FIELDS}
                values={footer.values}
                isAdmin={scope.isAdmin}
                fonts={scope.fonts}
                themeColors={themeColors(scope.theme)}
                onChange={footer.changeStyle}
            />
        </>
    );
}
