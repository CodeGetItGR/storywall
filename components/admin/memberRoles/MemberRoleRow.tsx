'use client';

import { ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { Locale } from '@/i18n/config';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function MemberRoleRow({
    role,
    isFirst,
    isLast,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    role: MemberRoleCatalogDto;
    isFirst: boolean;
    isLast: boolean;
    canReorder: boolean;
    onMoveAction: (roleId: string, direction: 'up' | 'down') => void;
    onEditAction: (roleId: string) => void;
}) {
    const t = useTranslations('AdminPage.memberRoles');
    const locale = useLocale() as Locale;
    const label = role.label[locale] || role.label.en;
    const status = role.retired ? 'RETIRED' : 'ACTIVE';

    function handleUp() {
        onMoveAction(role.id, 'up');
    }

    function handleDown() {
        onMoveAction(role.id, 'down');
    }

    function handleEdit() {
        onEditAction(role.id);
    }

    return (
        <tr className="border-b border-border/70 last:border-b-0">
            {/* Role */}
            <td className="px-3 py-2.5 text-sm font-semibold text-ink">
                {role.emoji && <span className="mr-1.5">{role.emoji}</span>}
                {label}
                {role.hostOnly && <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink-muted">{t('hostOnly')}</span>}
            </td>
            {/* Limit */}
            <td className="px-3 py-2.5">
                <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-[11px] font-bold text-ink-muted">
                    {role.maxHolders === null ? t('unlimited') : t('limitMax', { count: role.maxHolders })}
                </span>
            </td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-bold',
                        role.retired ? 'bg-status-neutral-wash text-status-neutral' : 'bg-status-good-wash text-status-good',
                    )}
                >
                    {t(`status.${status}`)}
                </span>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5">
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={handleUp}
                        disabled={!canReorder || isFirst}
                        aria-label={t('moveUp', { role: label })}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleDown}
                        disabled={!canReorder || isLast}
                        aria-label={t('moveDown', { role: label })}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-30"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </button>
                </div>
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={t('edit', { role: label })}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
}
