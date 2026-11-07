'use client';

import { useId } from 'react';

import { useInvitationRsvp } from '@/hooks/useInvitationRsvp';
import type { InvitationLabels } from '@/lib/invitation/labels';
import {
    RSVP_DEFAULT_ADULTS,
    RSVP_DEFAULT_CHILDREN,
    RSVP_MAX_ADULTS,
    RSVP_MAX_CHILDREN,
    rsvpCountOptions,
    type RsvpSender,
} from '@/lib/invitation/rsvp';

type RsvpFormProps = {
    labels: InvitationLabels;
    send?: RsvpSender;
};

export function RsvpForm({ labels, send }: RsvpFormProps) {
    const id = useId();
    const { attending, attend, decline, sending, sent, status, submit } = useInvitationRsvp(send, labels);

    if (sent) return <div className="rsvp-thankyou-card">{labels.rsvpThanks}</div>;

    return (
        <form className="rsvp-form" onSubmit={submit}>
            {/* Name */}
            <div>
                <label htmlFor={`${id}-name`}>{labels.rsvpName}</label>
                <input id={`${id}-name`} name="guestName" required placeholder={labels.rsvpPlaceholder} />
            </div>
            {/* Phone */}
            <div>
                <label htmlFor={`${id}-phone`}>{labels.rsvpPhone}</label>
                <input id={`${id}-phone`} name="phone" type="tel" required placeholder={labels.rsvpPlaceholder} />
            </div>
            {/* Email */}
            <div>
                <label htmlFor={`${id}-email`}>{labels.rsvpEmail}</label>
                <input id={`${id}-email`} name="email" type="email" placeholder={labels.rsvpPlaceholder} />
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
            {/* Guests */}
            <div className="rsvp-counts" style={attending ? undefined : { display: 'none' }}>
                <div>
                    <label htmlFor={`${id}-adults`}>{labels.rsvpAdults}</label>
                    <select id={`${id}-adults`} name="adultsCount" defaultValue={RSVP_DEFAULT_ADULTS}>
                        {rsvpCountOptions(1, RSVP_MAX_ADULTS).map((count) => (
                            <option key={count} value={count}>
                                {count}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${id}-children`}>{labels.rsvpChildren}</label>
                    <select id={`${id}-children`} name="childrenCount" defaultValue={RSVP_DEFAULT_CHILDREN}>
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
                <textarea id={`${id}-note`} name="note" placeholder={labels.rsvpPlaceholder} />
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
