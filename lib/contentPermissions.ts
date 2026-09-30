// Who may delete or report a piece of member content (a post or a comment). Hosts are not
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
 * Anyone in the event except the author, when the content still has an author to report and
 * the platform accepts reports for this target type.
 */
export function canReportContent({
    isMember,
    isAuthor,
    canWrite,
    hasAuthor,
    targetTypeReportable,
}: Omit<ContentActionContext, 'isHost'> & { hasAuthor: boolean; targetTypeReportable: boolean }): boolean {
    return isMember && canWrite && hasAuthor && !isAuthor && targetTypeReportable;
}
