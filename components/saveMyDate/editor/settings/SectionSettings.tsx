'use client';

import { useTranslations } from 'next-intl';

import { EditorDockedPanel } from '@/components/saveMyDate/editor/EditorDockedPanel';
import { SectionSettingsDone, SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';

type SectionSettingsProps = {
    panel: { scope: SettingsScope; groups: SettingsGroup[] } | null;
    // Wide screens show it beside the canvas; smaller ones in a sheet.
    isDocked: boolean;
    onClose: () => void;
};

// The open section's settings, docked on the right on wide screens or in a sheet from the bottom.
export function SectionSettings({ panel, isDocked, onClose }: SectionSettingsProps) {
    const t = useTranslations('InvitationEditor.sectionNames');
    const title = panel ? t(panel.scope.section.type) : '';
    const content = panel && <SectionSettingsPanel scope={panel.scope} groups={panel.groups} />;

    if (isDocked) {
        return (
            panel && (
                <EditorDockedPanel title={title} action={<SectionSettingsDone onClick={onClose} />}>
                    {content}
                </EditorDockedPanel>
            )
        );
    }

    return (
        <SectionSettingsSheet open={panel !== null} title={title} onClose={onClose}>
            {content}
        </SectionSettingsSheet>
    );
}
