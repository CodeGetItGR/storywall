'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { MembersPageState } from '@/hooks/useMembersPage';
import { formatDate } from '@/lib/datetime';

import { MemberRow } from './MemberRow';

export function MembersList({ page }: { page: MembersPageState }) {
    const tMembers = useTranslations('ManagePage.members');
    const tRoles = useTranslations('MemberRoles');

    return (
        <section aria-labelledby="members-list-title" className="flex flex-col">
            {/* Header */}
            <h2 id="members-list-title" className="mb-1.5 text-[17px] font-bold text-ink">
                {tMembers('title')}
            </h2>

            {/* Empty */}
            {page.guests.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
                        <Users className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">{tMembers('emptyTitle')}</p>
                    <p className="mt-1 text-sm text-ink-muted">{tMembers('emptyBody')}</p>
                </div>
            ) : (
                /* Rows */
                <ul>
                    {page.guests.map((member) => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            canPromote={page.canPromote && member.role !== 'HOST' && member.userId !== null}
                            canRemove={page.canModerate && member.role !== 'HOST'}
                            canReport={page.canReport && member.id !== page.activeMemberId}
                            joinedLabel={tMembers('joined', { date: formatDate(page.locale, member.joinedAt, { dateStyle: 'medium' }) })}
                            eventTypeKey={page.eventTypeKey}
                            editRoleLabel={tRoles('host.edit', { name: member.displayName })}
                            moreLabel={tMembers('moreFor', { name: member.displayName })}
                            onEditRoleAction={page.canManageRoles && !member.isFeatured ? page.roleSheet.open : undefined}
                            onPromoteAction={page.promoteFlow.requestForMember}
                            onReportAction={page.moderation.requestReport}
                            onRemoveAction={page.moderation.requestRemove}
                            promoteLabel={tMembers('promote')}
                            reportLabel={tMembers('report')}
                            removeLabel={tMembers('remove')}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}
