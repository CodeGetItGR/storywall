'use client';

import { RsvpForm } from '@/components/saveMyDate/invitation/sections/info/RsvpForm';
import { useRsvpDialog } from '@/hooks/useRsvpDialog';
import type { InvitationLabels } from '@/lib/invitation/labels';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import type { RsvpSessionChoice } from '@/lib/invitation/rsvpSessions';

type RsvpReplyProps = {
    // The section's own title, as the pop-up's title.
    title: string;
    labels: InvitationLabels;
    send?: RsvpSender;
    sessions: RsvpSessionChoice[];
};

// The section's two answers. Either opens the form in a pop-up with that answer picked (KAN-298).
export function RsvpReply({ title, labels, send, sessions }: RsvpReplyProps) {
    const { dialogRef, opened, sent, attend, decline, close, closed, markSent } = useRsvpDialog();

    return (
        <>
            {/* Answers, or the thanks once the reply is saved */}
            {sent && opened === null ? (
                <div className="rsvp-thankyou-card">{labels.rsvpThanks}</div>
            ) : (
                <div className="rsvp-choices">
                    <button type="button" className="theme-btn rsvp-btn" onClick={attend}>
                        {labels.rsvpYes}
                    </button>
                    <button type="button" className="theme-btn rsvp-btn rsvp-btn-outline" onClick={decline}>
                        {labels.rsvpNo}
                    </button>
                </div>
            )}

            {/* Pop-up */}
            <dialog ref={dialogRef} className="rsvp-dialog" aria-label={title || undefined} onClose={closed}>
                {opened !== null && (
                    <>
                        {/* Header */}
                        <div className="rsvp-dialog-head">
                            <p className="rsvp-dialog-title">{title}</p>
                            <button type="button" className="rsvp-dialog-close" aria-label={labels.close} onClick={close}>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                        {/* Form */}
                        <div className="rsvp-dialog-body">
                            <RsvpForm labels={labels} send={send} sessions={sessions} initialAttending={opened} onSent={markSent} />
                        </div>
                    </>
                )}
            </dialog>
        </>
    );
}
