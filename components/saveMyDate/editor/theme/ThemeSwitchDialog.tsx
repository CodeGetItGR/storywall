'use client';

import { Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { ThemeSwitchStep } from '@/hooks/useThemeSwitch';
import { sectionName } from '@/lib/invitation/sectionNames';
import type { ThemeSwitchSection } from '@/lib/invitation/themeSwitch';

type ThemeSwitchDialogProps = {
    step: ThemeSwitchStep;
    // The draft's event type, which names the schedule (sectionName).
    eventType?: string | null;
    onConfirm: () => void;
    // Back to the picker.
    onCancel: () => void;
};

// Asks before the design changes, and says what changes with it.
export function ThemeSwitchDialog({ step, eventType, onConfirm, onCancel }: ThemeSwitchDialogProps) {
    const t = useTranslations('InvitationEditor');
    const confirming = step.kind === 'confirming' ? step : null;
    const plan = confirming?.plan;

    return (
        <ConfirmActionModal
            open={confirming !== null}
            tone="default"
            icon={<Palette className="h-5 w-5" aria-hidden="true" />}
            iconTone="neutral"
            title={t('themeSwitch.confirmTitle', { name: confirming?.theme.name ?? '' })}
            body={
                <div className="flex flex-col gap-3">
                    {/* What stays */}
                    <p className="m-0">{t('themeSwitch.confirmBody')}</p>

                    {/* Sections hidden */}
                    {plan && plan.hidden.length > 0 && (
                        <SectionList title={t('themeSwitch.hiddenTitle')} sections={plan.hidden} eventType={eventType} />
                    )}

                    {/* Sections shown again */}
                    {plan && plan.restored.length > 0 && (
                        <SectionList title={t('themeSwitch.restoredTitle')} sections={plan.restored} eventType={eventType} />
                    )}

                    {/* Text colour and fonts */}
                    {plan?.resetsTextLook && <p className="m-0">{t('themeSwitch.textLookReset')}</p>}
                </div>
            }
            confirmLabel={t('themeSwitch.change')}
            cancelLabel={t('cancel')}
            onCloseAction={onCancel}
            onConfirmAction={onConfirm}
        />
    );
}

type SectionListProps = { title: string; sections: ThemeSwitchSection[]; eventType?: string | null };

// The sections a switch hides or shows again, by the names the add list uses.
function SectionList({ title, sections, eventType }: SectionListProps) {
    const t = useTranslations('InvitationEditor');
    const types = [...new Set(sections.map((section) => section.type))];

    return (
        <div className="flex flex-col gap-1">
            <p className="m-0">{title}</p>
            <ul className="m-0 list-disc pl-5">
                {types.map((type) => (
                    <li key={type}>{sectionName(t, type, eventType)}</li>
                ))}
            </ul>
        </div>
    );
}
