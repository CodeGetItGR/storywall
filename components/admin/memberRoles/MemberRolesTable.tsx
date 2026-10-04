'use client';

import { useTranslations } from 'next-intl';

import { MemberRoleRow } from '@/components/admin/memberRoles/MemberRoleRow';
import type { MemberRoleCatalogDto } from '@/lib/api/types';
import type { MoveDirection } from '@/lib/sortOrder';

export function MemberRolesTable({
    roles,
    hasAnyRoles,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    roles: MemberRoleCatalogDto[];
    hasAnyRoles: boolean;
    canReorder: boolean;
    onMoveAction: (roleId: string, direction: MoveDirection) => void;
    onEditAction: (roleId: string) => void;
}) {
    const t = useTranslations('AdminPage.memberRoles');

    if (roles.length === 0) {
        return <p className="px-3 py-8 text-center text-sm text-ink-muted">{hasAnyRoles ? t('noMatches') : t('empty')}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left">
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{t('columns.role')}</th>
                        <th className="px-3 py-2">{t('columns.limit')}</th>
                        <th className="px-3 py-2">{t('columns.status')}</th>
                        <th className="px-3 py-2">{t('columns.order')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {roles.map((role, index) => (
                        <MemberRoleRow
                            key={role.id}
                            role={role}
                            isFirst={index === 0}
                            isLast={index === roles.length - 1}
                            canReorder={canReorder}
                            onMoveAction={onMoveAction}
                            onEditAction={onEditAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
