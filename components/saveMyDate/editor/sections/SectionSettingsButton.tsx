'use client';

import { Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';

type SectionSettingsButtonProps = {
    onClick: () => void;
    className?: string;
};

// Opens the section's settings sheet.
export function SectionSettingsButton({ onClick, className }: SectionSettingsButtonProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');

    return (
        <SectionToolButton label={t('open')} onClick={onClick} className={className}>
            <Settings2 aria-hidden="true" />
        </SectionToolButton>
    );
}
