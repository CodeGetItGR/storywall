'use client';

import { useTranslations } from 'next-intl';

import type { TeamRole } from '@/lib/accountRole';
import { cn } from '@/lib/utils';

export function AccountRoleControl({
    role,
    disabled,
    onChangeAction,
}: {
    role: TeamRole;
    disabled?: boolean;
    onChangeAction: (role: TeamRole) => void;
}) {
    const t = useTranslations('AdminPage.accounts.roleAccess');

    function chooseUser() {
        onChangeAction('USER');
    }

    function chooseMarketing() {
        onChangeAction('MARKETING');
    }

    return (
        <div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
                <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={role === 'USER'}
                    onClick={chooseUser}
                    className={cn(
                        'rounded-md px-3 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60',
                        role === 'USER' ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t('user')}
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={role === 'MARKETING'}
                    onClick={chooseMarketing}
                    className={cn(
                        'rounded-md px-3 py-2 text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60',
                        role === 'MARKETING' ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                    )}
                >
                    {t('marketing')}
                </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">{role === 'MARKETING' ? t('marketingHint') : t('userHint')}</p>
        </div>
    );
}
