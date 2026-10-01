// Who may delete or report a piece of member content. Hosts are not
// exempt from reporting: their content is exactly what nobody else in the event can remove,
// so a report to the platform is the only recourse a guest has against it.

import { isLocalDemoContentId } from '@/lib/demo/demoDb';

// 'demoBuilder': an admin filling a demo event, who may edit and delete everything on it.
// 'demoVisitor': someone trying the public demo, who may only change what they added themselves.
export type ContentAccessMode = 'standard' | 'demoBuilder' | 'demoVisitor';

/** A public-demo visitor can't edit or delete content that came with the demo. */
export function isContentLocked(mode: ContentAccessMode, contentId: string): boolean {
    return mode === 'demoVisitor' && !isLocalDemoContentId(contentId);
}

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
