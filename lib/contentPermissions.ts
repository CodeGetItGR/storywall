// Who may delete or report a piece of member content. Hosts are not
// exempt from reporting: their content is exactly what nobody else in the event can remove,
// so a report to the platform is the only recourse a guest has against it.

type ContentActionContext = {
    isMember: boolean;
    isAuthor: boolean;
    isHost: boolean;
    canWrite: boolean;
};

/** The author, or any host of the event (the backend enforces the same rule). */
export function canDeleteContent({ isMember, isAuthor, isHost, canWrite }: ContentActionContext): boolean {
    return isMember && canWrite && (isAuthor || isHost);
}

/**
 * Anyone in the event except the author, when the platform accepts reports for this target type.
 * Content with no author on record (an anonymous QR upload, or an author who left) is reportable:
 * the report is about the content. Not gated on the event being writable: whatever a member can
 * see — on an ended event, or a host on a deleted one — they can report (DSA Art. 16).
 */
export function canReportContent({
    isMember,
    isAuthor,
    targetTypeReportable,
}: Pick<ContentActionContext, 'isMember' | 'isAuthor'> & { targetTypeReportable: boolean }): boolean {
    return isMember && !isAuthor && targetTypeReportable;
}
