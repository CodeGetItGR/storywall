'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export function EventCreationAccessControl({
    locked,
    disabled,
    onChangeAction,
}: {
    locked: boolean;
    disabled?: boolean;
    onChangeAction: (locked: boolean) => void;
}) {
    const t = useTranslations('AdminPage.accounts.access');

    function allowAccountCreation() {
        onChangeAction(false);
    }

    function limitToAdmins() {
        onChangeAction(true);
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
                <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={!locked}
                    onClick={allowAccountCreation}
                    className={cn(
                        'rounded-md px-3 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60',
                        !locked ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t('enabled')}
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={locked}
                    onClick={limitToAdmins}
                    className={cn(
                        'rounded-md px-3 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60',
                        locked ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t('disabled')}
                </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">{locked ? t('disabledHint') : t('enabledHint')}</p>
        </div>
    );
}
