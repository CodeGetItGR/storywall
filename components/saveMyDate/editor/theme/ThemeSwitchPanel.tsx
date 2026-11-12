'use client';

import { Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';

type ThemeSwitchPanelProps = {
    themeName: string;
    onChange: () => void;
};

// The design the invitation uses, at the top of the theme panel, and the way to change it.
export function ThemeSwitchPanel({ themeName, onChange }: ThemeSwitchPanelProps) {
    const t = useTranslations('InvitationEditor.themeSwitch');

    return (
        <div className="flex flex-col gap-2">
            {/* Current design */}
            <p className="m-0 font-medium">{t('current', { name: themeName })}</p>

            {/* Change */}
            <button
                type="button"
                onClick={onChange}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-muted px-4 font-medium transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <Palette className="h-4 w-4" aria-hidden="true" />
                {t('change')}
            </button>
        </div>
    );
}
