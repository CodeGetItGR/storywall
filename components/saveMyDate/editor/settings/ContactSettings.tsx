'use client';

import { ContactLinkFields } from '@/components/saveMyDate/editor/settings/ContactLinkFields';
import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useContactSettings } from '@/hooks/useContactSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The contact section's links (old contact panel).
export function ContactSettings({ scope }: { scope: SettingsScope<SectionOf<'contact'>> }) {
    const contact = useContactSettings(scope);

    return (
        <SettingsGroup>
            {/* Links */}
            <ContactLinkFields fields={scope.section.data} onSave={contact.save} />
        </SettingsGroup>
    );
}
