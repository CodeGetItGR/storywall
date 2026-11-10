'use client';

import { useTranslations } from 'next-intl';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { SectionSettingsGroups } from '@/components/saveMyDate/editor/settings/SectionSettingsGroups';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { SettingsGroup } from '@/lib/invitation/sectionSettings';
import { cn } from '@/lib/utils';

type SectionSettingsPanelProps = {
    scope: SettingsScope;
    groups: SettingsGroup[];
};

// One section's settings, all groups in one column. Every change shows on the
// canvas at once and is its own undo step.
export function SectionSettingsPanel({ scope, groups }: SectionSettingsPanelProps) {
    return (
        <div className="flex min-w-0 flex-col gap-5">
            <SectionSettingsGroups scope={scope} groups={groups} />
        </div>
    );
}

// Closes the settings. A Base UI close part can render it and pass its own props.
export const SectionSettingsDone = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function SectionSettingsDone(
    { className, ...props },
    ref,
) {
    const t = useTranslations('InvitationEditor.sectionSettings');

    return (
        <button
            ref={ref}
            type="button"
            className={cn(
                'h-9 shrink-0 rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none',
                className,
            )}
            {...props}
        >
            {t('done')}
        </button>
    );
});
