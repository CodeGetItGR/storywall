'use client';

import { ContactLinkFields } from '@/components/saveMyDate/editor/settings/ContactLinkFields';
import { SectionStyleSettings } from '@/components/saveMyDate/editor/settings/SectionStyleSettings';
import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useContactSettings } from '@/hooks/useContactSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { CONTACT_STYLE_FIELDS } from '@/lib/invitation/sectionStyleFields';

// The contact section's links and their style (old contact panel).
export function ContactSettings({ scope }: { scope: SettingsScope<SectionOf<'contact'>> }) {
    const contact = useContactSettings(scope);

    return (
        <>
            {/* Links */}
            <SettingsGroup>
                <ContactLinkFields fields={scope.section.data} onSave={contact.save} />
            </SettingsGroup>

            {/* Style */}
            <SectionStyleSettings scope={scope} groups={CONTACT_STYLE_FIELDS} />
        </>
    );
}
