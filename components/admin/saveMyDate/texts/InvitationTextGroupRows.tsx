'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminOrderArrows } from '@/components/admin/AdminOrderArrows';
import { AdminSortableList } from '@/components/admin/AdminSortableList';
import { AdminSortableRow } from '@/components/admin/AdminSortableRow';
import { useInvitationTextGroupMove } from '@/hooks/useInvitationTextsList';
import type { AdminInvitationTextDto, InvitationTextGroup } from '@/lib/adminInvitationTexts';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { MoveDirection } from '@/lib/sortOrder';

const COLUMN_COUNT = 6;

// The texts of one event type and language, dragged and moved among themselves.
export function InvitationTextGroupRows({
    group,
    eventTypeLabel,
    onEditAction,
}: {
    group: InvitationTextGroup;
    eventTypeLabel: string;
    onEditAction: (text: AdminInvitationTextDto) => void;
}) {
    const tAdmin = useTranslations('AdminPage');
    const move = useInvitationTextGroupMove(group.texts);

    return (
        <tbody className="border-b border-border last:border-b-0">
            {/* Move error */}
            {move.moveError && (
                <tr>
                    <td colSpan={COLUMN_COUNT} className="px-3 pt-3 text-sm text-status-danger">
                        {tAdmin(`errors.${adminErrorMessageKey(move.moveError)}`)}
                    </td>
                </tr>
            )}

            {/* Texts */}
            <AdminSortableList ids={move.ids} disabled={!move.canReorder} onReorderAction={move.reorderText}>
                {move.texts.map((text, index) => (
                    <InvitationTextRow
                        key={text.id}
                        text={text}
                        eventTypeLabel={eventTypeLabel}
                        isFirst={index === 0}
                        isLast={index === move.texts.length - 1}
                        canReorder={move.canReorder}
                        onMoveAction={move.moveText}
                        onEditAction={onEditAction}
                    />
                ))}
            </AdminSortableList>
        </tbody>
    );
}

function InvitationTextRow({
    text,
    eventTypeLabel,
    isFirst,
    isLast,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    text: AdminInvitationTextDto;
    eventTypeLabel: string;
    isFirst: boolean;
    isLast: boolean;
    canReorder: boolean;
    onMoveAction: (textId: string, direction: MoveDirection) => void;
    onEditAction: (text: AdminInvitationTextDto) => void;
}) {
    const tThemes = useTranslations('AdminPage.invitationThemes');
    const tLanguages = useTranslations('AdminPage.partnerApplications.languages');
    const editLabel = tThemes('edit', { name: text.label });

    function handleEdit() {
        onEditAction(text);
    }

    return (
        <AdminSortableRow id={text.id} name={text.label} className="border-b border-border/70 align-top last:border-b-0 hover:bg-canvas/60">
            {/* Event type */}
            <td className="px-3 py-2.5">
                <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-ink-muted">{eventTypeLabel}</span>
            </td>
            {/* Language */}
            <td className="px-3 py-2.5 text-sm text-ink-muted">{tLanguages(text.language)}</td>
            {/* Label */}
            <td className="px-3 py-2.5">
                <button type="button" onClick={handleEdit} className="text-left text-sm font-semibold text-ink hover:text-primary-dark">
                    {text.label}
                </button>
            </td>
            {/* Text */}
            <td className="px-3 py-2.5">
                <p className="line-clamp-2 text-sm leading-5 whitespace-pre-line text-ink-muted">{text.body}</p>
            </td>
            {/* Order */}
            <td className="px-3 py-1.5">
                <AdminOrderArrows id={text.id} name={text.label} isFirst={isFirst} isLast={isLast} disabled={!canReorder} onMoveAction={onMoveAction} />
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={editLabel}
                    title={editLabel}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </AdminSortableRow>
    );
}
