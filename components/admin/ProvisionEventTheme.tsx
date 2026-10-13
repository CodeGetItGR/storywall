'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ThemePresetRadioGroup } from '@/components/manage/ThemePresetRadioGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { ProvisionEventForm } from '@/hooks/useProvisionEventForm';
import { useThemeRadioOptions } from '@/hooks/useThemeRadioOptions';
import type { EventTypeConvention } from '@/lib/api/types';

// The optional theme pick. Sent with the create request; nothing is saved here.
export function ProvisionEventTheme({ form }: { form: ProvisionEventForm }) {
    const t = useTranslations('ManagePage.settings.theme');
    const toErrorMessage = useApiErrorMessage();
    const headingId = useId();
    const themeName = useModuleCopy(form.selectedEventType as EventTypeConvention)('theme').name;
    const options = useThemeRadioOptions(form.themePresets, form.selectedThemePresetId);
    const { isLoading, error } = form.themePresetsQuery;

    return (
        <section aria-labelledby={headingId} className="border-t border-border pt-6">
            <h3 id={headingId} className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                {themeName}
            </h3>
            {isLoading ? <LoadingState label={t('loading')} className="mt-4 justify-start" /> : null}
            {!isLoading && error ? <p className="mt-4 text-xs text-status-danger">{toErrorMessage(error)}</p> : null}
            {!isLoading && !error ? (
                <ThemePresetRadioGroup
                    options={options}
                    labelledBy={headingId}
                    disabled={false}
                    previewTitle={form.title.trim() || undefined}
                    onSelectAction={form.setThemePresetId}
                />
            ) : null}
        </section>
    );
}
