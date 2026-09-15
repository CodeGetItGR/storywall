'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PostActionsMenu } from '@/components/feed/post/PostActionsMenu';
import { ReportTargetModal } from '@/components/reports';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAppConfig, useDeleteComment } from '@/hooks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { CommentResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

type CommentActionsMenuProps = {
    comment: CommentResponseDto;
    wrapperClassName?: string;
};

export function CommentActionsMenu({ comment, wrapperClassName }: CommentActionsMenuProps) {
    const t = useTranslations('PostModal');
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const { data: appConfig } = useAppConfig();
    const toErrorMessage = useApiErrorMessage();
    const deleteComment = useDeleteComment(activeEvent?.id ?? '', comment.postId);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [reportOpen, setReportOpen] = useState(false);

    const isMyComment = Boolean(activeMember?.id && comment.authorMemberId === activeMember.id);
    const canWrite = isEventWritable(activeEvent?.status);
    const canDelete = Boolean(activeMember && canWrite && (isMyComment || isHost));
    const canReport = Boolean(
        activeMember && canWrite && !isMyComment && comment.authorMemberId && appConfig?.reportTargetTypes?.includes('COMMENT')
    );

    if (!activeEvent || (!canDelete && !canReport)) return null;

    function handleDeleteRequest() {
        setDeleteError(null);
        setDeleteConfirmOpen(true);
    }

    function handleCloseDeleteConfirm() {
        setDeleteConfirmOpen(false);
    }

    function handleOpenReport() {
        setReportOpen(true);
    }

    function handleCloseReport() {
        setReportOpen(false);
    }

    async function handleConfirmDelete() {
        try {
            await deleteComment.mutateAsync(comment.id);
            setDeleteConfirmOpen(false);
        } catch (error) {
            setDeleteError(toErrorMessage(error, t('deleteCommentFailed')));
        }
    }

    return (
        <>
            {/* Comment actions */}
            {wrapperClassName ? (
                <div className={wrapperClassName}>
                    <PostActionsMenu
                        deleteLabel={canDelete ? t('deleteComment') : undefined}
                        disabled={deleteComment.isPending}
                        isDeleting={deleteComment.isPending}
                        moreLabel={t('moreCommentOptions')}
                        onDeleteAction={canDelete ? handleDeleteRequest : undefined}
                        onReportAction={canReport ? handleOpenReport : undefined}
                        reportLabel={canReport ? t('reportComment') : undefined}
                    />
                </div>
            ) : (
                <PostActionsMenu
                    deleteLabel={canDelete ? t('deleteComment') : undefined}
                    disabled={deleteComment.isPending}
                    isDeleting={deleteComment.isPending}
                    moreLabel={t('moreCommentOptions')}
                    onDeleteAction={canDelete ? handleDeleteRequest : undefined}
                    onReportAction={canReport ? handleOpenReport : undefined}
                    reportLabel={canReport ? t('reportComment') : undefined}
                />
            )}

            {/* Confirm comment deletion */}
            <ConfirmActionModal
                open={deleteConfirmOpen}
                onCloseAction={handleCloseDeleteConfirm}
                onConfirmAction={handleConfirmDelete}
                title={t('deleteCommentConfirmTitle')}
                body={
                    <>
                        {t('deleteCommentConfirmBody')}
                        {deleteError && <span className="mt-1 block text-destructive">{deleteError}</span>}
                    </>
                }
                confirmLabel={t('deleteComment')}
                cancelLabel={t('cancel')}
                isConfirming={deleteComment.isPending}
            />

            {/* Report comment */}
            {reportOpen && (
                <ReportTargetModal
                    open
                    eventId={activeEvent.id}
                    targetType="COMMENT"
                    targetId={comment.id}
                    targetName={comment.author?.displayName ?? t('unknownAuthor')}
                    onCloseAction={handleCloseReport}
                />
            )}
        </>
    );
}
