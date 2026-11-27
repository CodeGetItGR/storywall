import './programTimeline.css';

import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ProgramTimelineEntry = {
    id: string;
    time: ReactNode;
    label: ReactNode;
    // More under the name: the feed puts the place and the RSVP button here.
    extra?: ReactNode;
    className?: string;
    // The dot's own look: the feed's gradient dot on the session under way.
    dotStyle?: CSSProperties;
};

type ProgramTimelineProps = { entries: readonly ProgramTimelineEntry[]; style?: CSSProperties; className?: string };

// Moments alternating either side of a centre line: the time over the name, a dot on the line. Save my date's Program
// section and the feed's schedule (KAN-293) both draw it.
export function ProgramTimeline({ entries, style, className }: ProgramTimelineProps) {
    return (
        <div role="list" className={cn('program-list', className)} style={style}>
            {entries.map((entry, index) => (
                <div key={entry.id} role="listitem" className={cn('program-item', index % 2 === 0 ? 'side-left' : 'side-right', entry.className)}>
                    <div className="program-content">
                        <div className="program-time">{entry.time}</div>
                        <div className="program-label">{entry.label}</div>
                        {entry.extra}
                    </div>
                    <div className="program-dot" style={entry.dotStyle} />
                </div>
            ))}
        </div>
    );
}
