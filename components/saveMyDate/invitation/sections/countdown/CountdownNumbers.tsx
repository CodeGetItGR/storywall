'use client';

import { useInvitationCountdown } from '@/hooks/useInvitationCountdown';
import type { InvitationLabels } from '@/lib/invitation/labels';

type CountdownNumbersProps = { targetIso: string | undefined; labels: InvitationLabels };

export function CountdownNumbers({ targetIso, labels }: CountdownNumbersProps) {
    const parts = useInvitationCountdown(targetIso);
    const units = [
        { value: parts.days, label: labels.countdownDays },
        { value: parts.hours, label: labels.countdownHours },
        { value: parts.mins, label: labels.countdownMinutes },
        { value: parts.secs, label: labels.countdownSeconds },
    ];

    return (
        <div className="wedart-countdown">
            {units.map((unit, index) => (
                <CountdownUnit key={unit.label} value={unit.value} label={unit.label} withDot={index > 0} />
            ))}
        </div>
    );
}

type CountdownUnitProps = { value: string; label: string; withDot: boolean };

function CountdownUnit({ value, label, withDot }: CountdownUnitProps) {
    return (
        <>
            {withDot && <span className="wedart-countdown-dot">•</span>}
            <div className="wedart-countdown-unit">
                <span className="wedart-countdown-num">{value}</span>
                <span className="wedart-countdown-unit-label">{label}</span>
            </div>
        </>
    );
}
