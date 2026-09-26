'use client';

import { useTranslations } from 'next-intl';

import type { RsvpReportSessionDto } from '@/lib/api/types';

// "Reception: 184 people · 10 no answer" per session the guests could answer.
// Events whose sessions aren't open to RSVPs have none, and no section.
export function RsvpReportSessions({ sessions }: { sessions: RsvpReportSessionDto[] }) {
    const t = useTranslations('ManagePage.rsvpReport');

    if (sessions.length === 0) return null;

    return (
        <section>
            {/* Heading */}
            <h2 className="mb-3 text-xs font-bold tracking-wide text-ink-faint uppercase">{t('perSession')}</h2>

            {/* Sessions */}
            <ul className="flex flex-col gap-1.5 text-sm text-ink">
                {sessions.map((session) => (
                    <li key={session.sessionId}>
                        {`${session.title}: ${t('people', { count: session.people })}`}
                        {session.noAnswerPeople > 0 && ` · ${t('noAnswer', { count: session.noAnswerPeople })}`}
                    </li>
                ))}
            </ul>
        </section>
    );
}
