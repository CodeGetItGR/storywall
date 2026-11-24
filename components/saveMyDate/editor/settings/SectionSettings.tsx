'use client';

import { useTranslations } from 'next-intl';

import { EditorDockedPanel } from '@/components/saveMyDate/editor/EditorDockedPanel';
import { SectionSettingsDone, SectionSettingsPanel } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { sectionName } from '@/lib/invitation/sectionNames';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';

type SectionSettingsProps = {
    panel: { scope: SettingsScope; groups: SettingsGroup[] } | null;
    // Wide screens show it beside the canvas; smaller ones in a sheet.
    isDocked: boolean;
    // The draft's event type, which names the schedule (sectionName). A theme has none.
    eventType?: string | null;
    onClose: () => void;
};

// The open section's settings, docked on the right on wide screens or in a sheet from the bottom.
export function SectionSettings({ panel, isDocked, eventType, onClose }: SectionSettingsProps) {
    const t = useTranslations('InvitationEditor');
    const title = panel ? sectionName(t, panel.scope.section.type, eventType) : '';
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
