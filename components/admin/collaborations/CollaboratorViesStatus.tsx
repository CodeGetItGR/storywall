'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { useCollaboratorViesCheck } from '@/hooks/useCollaboratorViesCheck';
import type { CollaboratorResponseDto, ViesStatus } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const VIES_PILL: Record<ViesStatus, string> = {
    VALID: 'bg-status-good-wash text-status-good',
    PENDING: 'bg-status-warn-wash text-status-warn',
    INVALID: 'bg-status-danger-wash text-status-danger',
};

export function CollaboratorViesStatus({ collaborator }: { collaborator: CollaboratorResponseDto }) {
    const t = useTranslations('AdminPage.collaborations.business.vies');
    const locale = useLocale();
    const vies = useCollaboratorViesCheck(collaborator);
    const registered = [collaborator.viesName, collaborator.viesAddress].filter(Boolean).join(' · ');

    return (
        <div className="space-y-1">
            {/* Status + re-check */}
            <div className="flex flex-wrap items-center gap-2">
                {collaborator.viesStatus ? (
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold', VIES_PILL[collaborator.viesStatus])}>
                        {t(collaborator.viesStatus)}
                    </span>
                ) : (
                    <span className="text-sm text-ink-faint">{t('none')}</span>
                )}
                {collaborator.viesCheckedAt && (
                    <span className="text-[11px] text-ink-faint">
                        {t('checkedAt', { date: formatDate(locale, collaborator.viesCheckedAt, { dateStyle: 'medium' }) })}
                    </span>
                )}
                <button
                    type="button"
                    onClick={vies.recheck}
                    disabled={!vies.canRecheck || vies.isChecking}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                >
                    {vies.isChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {t('recheck')}
                </button>
            </div>

            {/* What VIES has on record */}
            {registered && <p className="text-xs text-ink-muted">{registered}</p>}
            {Boolean(vies.checkError) && <p className="text-xs text-status-danger">{t('failed')}</p>}
        </div>
    );
}
