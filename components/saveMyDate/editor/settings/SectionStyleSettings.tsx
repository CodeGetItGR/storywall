'use client';

import { StyleFields } from '@/components/saveMyDate/editor/settings/StyleFields';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { useSectionStyleSettings } from '@/hooks/useSectionStyleSettings';
import type { StyleFieldGroup } from '@/lib/invitation/sectionStyleFields';

type SectionStyleSettingsProps = {
    scope: SettingsScope;
    groups: StyleFieldGroup[];
};

// The style settings of a countdown, FAQ, RSVP, program, places to stay or contact section.
export function SectionStyleSettings({ scope, groups }: SectionStyleSettingsProps) {
    const style = useSectionStyleSettings(scope);
    return <StyleFields groups={groups} values={style.values} isAdmin={scope.isAdmin} fonts={scope.fonts} onChange={style.change} />;
}
