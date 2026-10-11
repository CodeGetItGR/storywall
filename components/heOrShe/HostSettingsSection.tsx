'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DateTimeField } from '@/components/ui/DateTimeField';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useHeOrSheHostSettings } from '@/hooks/useHeOrSheHostSettings';
import type { HeOrSheViewDto } from '@/lib/api/types';

/** When voting closes. Gone once it has closed. */
export function HostSettingsSection({ eventId, view }: { eventId: string; view: HeOrSheViewDto }) {
    const t = useTranslations('HeOrShePage.host');
    const toErrorMessage = useApiErrorMessage();
    const settings = useHeOrSheHostSettings(eventId, view);

    // Once voting closes there is nothing left to set.
    if (settings.locked) return null;

    return (
        <section className="space-y-4 rounded-2xl bg-surface-muted/60 p-4">
            <h2 className="text-base font-semibold text-ink">{t('settingsTitle')}</h2>

            <form onSubmit={settings.save} className="space-y-4">
                {/* Closing time */}
                <div className="space-y-2">
                    <span className="text-sm font-semibold text-ink">{t('closesAt')}</span>
                    <DateTimeField value={settings.closesAt} onChange={settings.setClosesAt} />
                    <p className="text-xs text-ink-faint">{t('closesAtHint')}</p>
                </div>

                {settings.saveError && (
                    <p role="alert" className="text-xs text-rose-600">
                        {toErrorMessage(settings.saveError)}
                    </p>
                )}

                {/* Actions */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!settings.canSave}
                        className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
                    >
                        {settings.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('save')}
                    </button>
                </div>
            </form>
        </section>
    );
}
