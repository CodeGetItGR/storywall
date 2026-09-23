'use client';

import { ArrowRight, CheckCircle2, HelpCircle, RefreshCw, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';

import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { quizQuestions } from '@/lib/mock-data';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type Phase = 'quiz' | 'results';

export default function QuizPage() {
    const t = useTranslations('QuizPage');
    const { eventId } = useParams<{ eventId: string }>();
    const backHref = routes.events.feed(eventId);
    const [phase, setPhase] = useState<Phase>('quiz');
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(quizQuestions.length).fill(null));
    const [revealed, setRevealed] = useState(false);

    const question = quizQuestions[current];
    const selected = answers[current];
    const isLast = current === quizQuestions.length - 1;

    const handleSelect = useCallback(
        (idx: number) => {
            if (revealed) return;
            setAnswers((prev) => {
                const next = [...prev];
                next[current] = idx;
                return next;
            });
            setRevealed(true);
        },
        [current, revealed],
    );

    function handleNext() {
        if (isLast) {
            setPhase('results');
        } else {
            setCurrent((c) => c + 1);
            setRevealed(false);
        }
    }

    function handleReset() {
        setPhase('quiz');
        setCurrent(0);
        setAnswers(new Array(quizQuestions.length).fill(null));
        setRevealed(false);
    }

    const handleAnswerClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            const index = Number(event.currentTarget.dataset.answerIndex);
            if (!Number.isNaN(index)) handleSelect(index);
        },
        [handleSelect],
    );

    const score = answers.filter((a, i) => a === quizQuestions[i].correct).length;

    if (phase === 'results') {
        const pct = Math.round((score / quizQuestions.length) * 100);
        const grade = pct === 100 ? t('grades.perfect') : pct >= 80 ? t('grades.excellent') : pct >= 60 ? t('grades.good') : t('grades.okay');

        return (
            <ModulePageShell
                title={t('resultsTitle')}
                icon={HelpCircle}
                iconClassName="text-orange-500"
                backLabel={t('backToTools')}
                backHref={backHref}
            >
                <div className="flex flex-col items-center px-4 py-10 text-center">
                    <div className="mb-6 flex h-28 w-28 flex-col items-center justify-center rounded-full text-white shadow-lg bg-gradient-brand">
                        <p className="text-3xl font-bold tabular-nums">
                            {score}/{quizQuestions.length}
                        </p>
                        <p className="text-sm opacity-80">{pct}%</p>
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-ink">{t('quizComplete')}</h2>
                    <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{grade}</p>

                    <button
                        onClick={handleReset}
                        className="mt-8 flex items-center gap-2 rounded-full bg-surface-muted px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-border"
                    >
                        <RefreshCw className="h-4 w-4" />
                        {t('tryAgain')}
                    </button>
                </div>

                {/* Answer review */}
                <h3 className="mb-3 text-sm font-bold text-ink">{t('reviewYourAnswers')}</h3>
                <div className="flex flex-col gap-3">
                    {quizQuestions.map((q, i) => {
                        const userAnswer = answers[i];
                        const correct = userAnswer === q.correct;
                        return (
                            <div key={q.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                                <p className="mb-2 text-sm font-semibold text-ink">{q.question}</p>
                                <div className="flex items-start gap-2">
                                    {correct ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                    ) : (
                                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                                    )}
                                    <p className="text-xs leading-snug text-ink-muted">
                                        {correct
                                            ? t('correctAnswer', { answer: q.options[q.correct] })
                                            : t('yourAnswerVsCorrect', {
                                                  yourAnswer: userAnswer !== null ? q.options[userAnswer] : t('skipped'),
                                                  correctAnswer: q.options[q.correct],
                                              })}
                                    </p>
                                </div>
                                <p className="mt-2 text-xs leading-snug text-ink-faint italic">{q.explanation}</p>
                            </div>
                        );
                    })}
                </div>
            </ModulePageShell>
        );
    }

    return (
        <ModulePageShell title={t('title')} icon={HelpCircle} iconClassName="text-orange-500" backLabel={t('backToTools')} backHref={backHref}>
            {/* Progress bar */}
            <div className="mb-6 flex gap-1.5">
                {quizQuestions.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors',
                            i < current ? 'bg-primary' : i === current ? 'bg-primary/60' : 'bg-border',
                        )}
                    />
                ))}
            </div>

            {/* Question counter */}
            <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wide text-ink-muted uppercase">
                    {t('questionCounter', { current: current + 1, total: quizQuestions.length })}
                </span>
                {revealed && (
                    <span className={cn('text-xs font-bold', selected === question.correct ? 'text-emerald-600' : 'text-rose-500')}>
                        {selected === question.correct ? t('correct') : t('notQuite')}
                    </span>
                )}
            </div>

            {/* Question card */}
            <div className="mb-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
                <p className="mb-5 text-base leading-snug font-bold text-ink">{question.question}</p>

                <div className="flex flex-col gap-2.5">
                    {question.options.map((option, idx) => {
                        const isSelected = selected === idx;
                        const isCorrect = idx === question.correct;
                        let style = 'border-border bg-surface-muted text-ink-muted hover:border-primary/30 hover:text-ink';
                        if (revealed) {
                            if (isCorrect) style = 'border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold';
                            else if (isSelected && !isCorrect) style = 'border-rose-300 bg-rose-50 text-rose-600';
                        } else if (isSelected) {
                            style = 'border-primary bg-primary-light text-primary-dark font-semibold';
                        }

                        return (
                            <button
                                key={idx}
                                data-answer-index={idx}
                                onClick={handleAnswerClick}
                                disabled={revealed}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all',
                                    style,
                                    revealed ? 'cursor-default' : 'cursor-pointer',
                                )}
                            >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-current text-[10px] font-bold">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {option}
                                {revealed && isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />}
                                {revealed && isSelected && !isCorrect && <XCircle className="ml-auto h-4 w-4 shrink-0 text-rose-500" />}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {revealed && (
                    <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3">
                        <p className="text-xs leading-relaxed text-ink-muted italic">{question.explanation}</p>
                    </div>
                )}
            </div>

            {revealed && (
                <button
                    onClick={handleNext}
                    className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    {isLast ? t('seeResults') : t('nextQuestion')}
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </ModulePageShell>
    );
}
