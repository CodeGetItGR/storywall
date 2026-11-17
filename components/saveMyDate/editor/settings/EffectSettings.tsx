'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { SettingsChoices } from '@/components/saveMyDate/editor/settings/SettingsChoices';
import { SettingsGroup, SettingsSelect } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useEffectSettings, useTransitionSettings } from '@/hooks/useEffectSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';

const SPEEDS = ['slow', 'normal'] as const;
const INTENSITIES = ['subtle', 'strong'] as const;
const EDGES = ['bottom', 'top'] as const;

// Admin: the background effect (old wedartOpenSectionBgEffect).
export function EffectSettings({ scope }: { scope: SettingsScope }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const id = useId();
    const effect = useEffectSettings(scope);

    return (
        <SettingsGroup title={t('effect')}>
            {/* Effect */}
            <label htmlFor={id} className="sr-only">
                {t('effect')}
            </label>
            <SettingsSelect id={id} value={effect.effect.type} onChange={effect.onType}>
                {effect.types.map((type) => (
                    <option key={type} value={type}>
                        {t(`effects.${type}`)}
                    </option>
                ))}
            </SettingsSelect>

            {/* Speed and intensity */}
            {effect.effect.type !== 'none' && (
                <>
                    <SettingsChoices
                        label={t('speed')}
                        choices={SPEEDS.map((value) => ({ value, label: t(`speeds.${value}`) }))}
                        value={effect.effect.speed}
                        onChange={effect.setSpeed}
                    />
                    <SettingsChoices
                        label={t('intensity')}
                        choices={INTENSITIES.map((value) => ({ value, label: t(`intensities.${value}`) }))}
                        value={effect.effect.intensity}
                        onChange={effect.setIntensity}
                    />
                </>
            )}
        </SettingsGroup>
    );
}

// Admin: the transition into the next section or from the one before (old wedartOpenSectionTransition).
export function TransitionSettings({ scope }: { scope: SettingsScope }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const id = useId();
    const transition = useTransitionSettings(scope);

    return (
        <SettingsGroup title={t('transition')}>
            {/* Transition */}
            <label htmlFor={id} className="sr-only">
                {t('transition')}
            </label>
            <SettingsSelect id={id} value={transition.assetId} onChange={transition.onAsset}>
                <option value="">{t('noTransition')}</option>
                {transition.options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </SettingsSelect>

            {/* Position */}
            {transition.hasTransition && (
                <SettingsChoices
                    label={t('position')}
                    choices={EDGES.map((value) => ({ value, label: t(`edges.${value}`) }))}
                    value={transition.edge}
                    onChange={transition.setEdge}
                />
            )}
        </SettingsGroup>
    );
}
