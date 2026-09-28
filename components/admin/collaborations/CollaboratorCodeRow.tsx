'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminCodeStatusPill } from '@/components/admin/AdminCodeStatusPill';
import { CodeRestrictionPills } from '@/components/admin/CodeRestrictionPills';
import type { CollaborationCodeResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function CollaboratorCodeRow({
    code,
    onEditAction,
}: {
    code: CollaborationCodeResponseDto;
    onEditAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const t = useTranslations('AdminPage.collaborations.codes');

    return (
        <tr className={cn('border-b border-border last:border-b-0 hover:bg-canvas/60', code.status !== 'ACTIVE' && 'opacity-60')}>
            <td className="max-w-64 px-3 py-2">
                <p className="font-mono text-xs font-bold text-ink">{code.code}</p>
                <p className="truncate text-xs text-ink-muted">{code.label}</p>
            </td>
            <td className="px-2.5 py-2 text-ink-muted">{t('ratePair', { discount: code.discountPercent, commission: code.commissionPercent })}</td>
            <td className="px-2.5 py-2 font-mono text-ink">
                {code.maxRedemptions === null ? code.liveRedemptions : `${code.liveRedemptions} / ${code.maxRedemptions}`}
            </td>
            <td className="px-2.5 py-2">
                <CodeRestrictionPills restrictions={code} />
            </td>
            <td className="px-2.5 py-2">
                <AdminCodeStatusPill status={code.status} />
            </td>
            <td className="px-2.5 py-2 text-right">
                <button
                    type="button"
                    data-code-id={code.id}
                    onClick={onEditAction}
                    aria-label={t('editTitle', { code: code.code })}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            </td>
        </tr>
    );
}
