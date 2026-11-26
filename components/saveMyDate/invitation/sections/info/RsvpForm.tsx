'use client';

import { type CSSProperties, useId } from 'react';

import { RsvpSessionRows } from '@/components/saveMyDate/invitation/sections/info/RsvpSessionRows';
import { useInvitationRsvp } from '@/hooks/useInvitationRsvp';
import type { InvitationLabels } from '@/lib/invitation/labels';
import {
    RSVP_DEFAULT_ADULTS,
    RSVP_DEFAULT_CHILDREN,
    RSVP_HONEYPOT_FIELD,
    RSVP_MAX_ADULTS,
    RSVP_MAX_CHILDREN,
    RSVP_MAX_EMAIL,
    RSVP_MAX_NAME,
    RSVP_MAX_NOTES,
    RSVP_MAX_PHONE,
    rsvpCountOptions,
    type RsvpSender,
} from '@/lib/invitation/rsvp';
import type { RsvpSessionChoice } from '@/lib/invitation/rsvpSessions';

type RsvpFormProps = {
    labels: InvitationLabels;
    send?: RsvpSender;
    // The sessions with RSVP turned on, asked about while the guest is attending.
    sessions?: RsvpSessionChoice[];
    // The answer picked when the form opens.
    initialAttending?: boolean;
    onSent?: () => void;
};

const NO_SESSIONS: RsvpSessionChoice[] = [];

const HONEYPOT_STYLE: CSSProperties = { position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' };

export function RsvpForm({ labels, send, sessions = NO_SESSIONS, initialAttending, onSent }: RsvpFormProps) {
    const id = useId();
    const { attending, attend, decline, sending, sent, status, submit } = useInvitationRsvp(send, labels, {
        sessionIds: sessions.map((session) => session.id),
        initialAttending,
        onSent,
    });

    if (sent) return <div className="rsvp-thankyou-card">{labels.rsvpThanks}</div>;

    return (
        <form className="rsvp-form" onSubmit={submit}>
            {/* Name */}
            <div>
                <label htmlFor={`${id}-name`}>{labels.rsvpName}</label>
                <input id={`${id}-name`} name="guestName" required maxLength={RSVP_MAX_NAME} placeholder={labels.rsvpPlaceholder} />
            </div>
            {/* Phone */}
            <div>
                <label htmlFor={`${id}-phone`}>{labels.rsvpPhone}</label>
                <input id={`${id}-phone`} name="phone" type="tel" required maxLength={RSVP_MAX_PHONE} placeholder={labels.rsvpPlaceholder} />
            </div>
            {/* Email */}
            <div>
                <label htmlFor={`${id}-email`}>{labels.rsvpEmail}</label>
                <input id={`${id}-email`} name="email" type="email" maxLength={RSVP_MAX_EMAIL} placeholder={labels.rsvpPlaceholder} />
            </div>
            {/* Attendance */}
            <div>
                <label id={`${id}-attend`}>{labels.rsvpAttend}</label>
                <div className="rsvp-options" role="radiogroup" aria-labelledby={`${id}-attend`}>
                    <label className="rsvp-option">
                        <input type="radio" name="attendance" value="both" checked={attending} onChange={attend} />
                        <span>{labels.rsvpYes}</span>
                    </label>
                    <label className="rsvp-option">
                        <input type="radio" name="attendance" value="declined" checked={!attending} onChange={decline} />
                        <span>{labels.rsvpNo}</span>
                    </label>
                </div>
            </div>
            {/* Sessions */}
            {sessions.length > 0 && (
                <div style={attending ? undefined : { display: 'none' }}>
                    <RsvpSessionRows id={id} labels={labels} sessions={sessions} />
                </div>
            )}
            {/* Guests */}
            <div className="rsvp-counts" style={attending ? undefined : { display: 'none' }}>
                <div>
                    <label htmlFor={`${id}-adults`}>{labels.rsvpAdults}</label>
                    <select id={`${id}-adults`} name="adultCount" defaultValue={RSVP_DEFAULT_ADULTS}>
                        {rsvpCountOptions(1, RSVP_MAX_ADULTS).map((count) => (
                            <option key={count} value={count}>
                                {count}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${id}-children`}>{labels.rsvpChildren}</label>
                    <select id={`${id}-children`} name="childCount" defaultValue={RSVP_DEFAULT_CHILDREN}>
                        {rsvpCountOptions(0, RSVP_MAX_CHILDREN).map((count) => (
                            <option key={count} value={count}>
                                {count}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {/* Notes */}
            <div>
                <label htmlFor={`${id}-note`}>{labels.rsvpNotes}</label>
                <textarea id={`${id}-note`} name="notes" maxLength={RSVP_MAX_NOTES} placeholder={labels.rsvpPlaceholder} />
            </div>
            {/* Honeypot: off-screen and hidden from screen readers, so only a bot fills it */}
            <div aria-hidden="true" style={HONEYPOT_STYLE}>
                <input name={RSVP_HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            {/* Submit */}
            <button className="theme-btn rsvp-btn" type="submit" disabled={sending}>
                {labels.rsvpSubmit}
            </button>
            <div className={['rsvp-status', status && (status.ok ? 'ok' : 'error')].filter(Boolean).join(' ')} role="status">
                {status?.message}
            </div>
        </form>
    );
}
