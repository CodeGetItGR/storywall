'use client';

import { useTranslations } from 'next-intl';

import Avatar from '@/components/ui/avatar';
import { type ResultPerson, useHeOrSheResultGroups } from '@/hooks/useHeOrSheResultGroups';
import type { HeOrSheResultsDto, QuizQuestionDto } from '@/lib/api/types';
import { getInitials } from '@/lib/format';

/** Every answer by name. Hosts only; the counts live in the tally above, not here. */
export function HostResults({ questions, results }: { questions: QuizQuestionDto[]; results: HeOrSheResultsDto | undefined }) {
    const t = useTranslations('HeOrShePage');
    const groups = useHeOrSheResultGroups(questions, results);

    return (
        <section className="space-y-5">
            <h2 className="text-base font-semibold text-ink">{t('host.resultsTitle')}</h2>

            {/* Guesses */}
            <div className="grid gap-4 sm:grid-cols-2">
                <PeopleList title={t('he')} people={groups.he} titleClassName="text-sky-700" />
                <PeopleList title={t('she')} people={groups.she} titleClassName="text-pink-700" />
            </div>

            {/* Extra questions */}
            {groups.questions.map((question) => (
                <div key={question.id} className="space-y-2">
                    <h3 className="text-sm font-semibold text-ink">{question.prompt}</h3>
                    {question.answers.length === 0 ? (
                        <p className="text-sm text-ink-muted">{t('host.noAnswers')}</p>
                    ) : (
                        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface-muted/60">
                            {question.answers.map((answer) => (
                                <li key={answer.memberId} className="flex items-start gap-3 px-4 py-2.5">
                                    <Avatar size="xs" src={answer.avatarUrl} initials={getInitials(answer.displayName)} alt="" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-ink-muted">{answer.displayName}</p>
                                        <p className="text-sm whitespace-pre-line text-ink">{answer.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </section>
    );
}

function PeopleList({ title, people, titleClassName }: { title: string; people: ResultPerson[]; titleClassName: string }) {
    const t = useTranslations('HeOrShePage');
    return (
        <div className="space-y-2">
            <h3 className={`text-sm font-semibold ${titleClassName}`}>{title}</h3>
            {people.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('host.noAnswers')}</p>
            ) : (
                <ul className="space-y-2">
                    {people.map((person) => (
                        <li key={person.memberId} className="flex items-center gap-2 text-sm text-ink">
                            <Avatar size="xs" src={person.avatarUrl} initials={getInitials(person.displayName)} alt="" />
                            <span className="truncate">{person.displayName}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
