import type { InvitationLabels } from '@/lib/invitation/labels';
import { rsvpSessionField } from '@/lib/invitation/rsvp';
import type { RsvpSessionChoice } from '@/lib/invitation/rsvpSessions';

type RsvpSessionRowsProps = {
    id: string;
    labels: InvitationLabels;
    sessions: RsvpSessionChoice[];
};

// A yes or no for each session with RSVP turned on (KAN-298), as the signed-in RSVP page asks.
export function RsvpSessionRows({ id, labels, sessions }: RsvpSessionRowsProps) {
    return (
        <div className="rsvp-sessions">
            {/* Heading */}
            <p className="rsvp-sessions-title" id={`${id}-sessions`}>
                {labels.rsvpSessionsTitle}
            </p>
            <p className="rsvp-sessions-hint">{labels.rsvpSessionsRequired}</p>

            {/* Rows */}
            {sessions.map((session) => (
                <div key={session.id} className="rsvp-session" role="radiogroup" aria-labelledby={`${id}-session-${session.id}`}>
                    <div className="rsvp-session-name" id={`${id}-session-${session.id}`}>
                        <span>{session.title}</span>
                        {session.when && <span className="rsvp-session-when">{session.when}</span>}
                    </div>
                    <label className="rsvp-session-answer">
                        <input type="radio" name={rsvpSessionField(session.id)} value="yes" />
                        <span>{labels.rsvpSessionYes}</span>
                    </label>
                    <label className="rsvp-session-answer">
                        <input type="radio" name={rsvpSessionField(session.id)} value="no" />
                        <span>{labels.rsvpSessionNo}</span>
                    </label>
                </div>
            ))}
        </div>
    );
}
