'use client';

import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { quizQuestions } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

type Phase = 'quiz' | 'results';

export default function QuizPage() {
    const t = useTranslations('QuizPage');
    const [phase, setPhase] = useState<Phase>('quiz');
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(quizQuestions.length).fill(null));
    const [revealed, setRevealed] = useState(false);

    const question = quizQuestions[current];
    const selected = answers[current];
    const isLast = current === quizQuestions.length - 1;

    function handleSelect(idx: number) {
        if (revealed) return;
        setAnswers((prev) => {
            const next = [...prev];
            next[current] = idx;
            return next;
        });
        setRevealed(true);
    }

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

    const score = answers.filter((a, i) => a === quizQuestions[i].correct).length;

    if (phase === 'results') {
        const pct = Math.round((score / quizQuestions.length) * 100);
        const grade = pct === 100 ? t('grades.perfect') : pct >= 80 ? t('grades.excellent') : pct >= 60 ? t('grades.good') : t('grades.okay');

        return (
            <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
                <div className="flex items-center gap-3 py-4 mb-2">
                    <Link
                        href="/tools"
                        aria-label={t('backToTools')}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-base font-bold text-ink">{t('resultsTitle')}</h1>
                </div>

                <div className="flex flex-col items-center text-center py-10 px-4">
                    <div className="w-28 h-28 rounded-full bg-gradient-brand flex flex-col items-center justify-center text-white mb-6 shadow-lg">
                        <p className="text-3xl font-bold tabular-nums">
                            {score}/{quizQuestions.length}
                        </p>
                        <p className="text-sm opacity-80">{pct}%</p>
                    </div>
                    <h2 className="text-xl font-bold text-ink mb-2">{t('quizComplete')}</h2>
                    <p className="text-sm text-ink-muted leading-relaxed max-w-xs">{grade}</p>

                    <button
                        onClick={handleReset}
                        className="mt-8 flex items-center gap-2 px-6 py-3 rounded-full bg-surface-muted text-ink text-sm font-semibold hover:bg-border transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {t('tryAgain')}
                    </button>
                </div>

                {/* Answer review */}
                <h3 className="text-sm font-bold text-ink mb-3">{t('reviewYourAnswers')}</h3>
                <div className="flex flex-col gap-3">
                    {quizQuestions.map((q, i) => {
                        const userAnswer = answers[i];
                        const correct = userAnswer === q.correct;
                        return (
                            <div key={q.id} className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
                                <p className="text-sm font-semibold text-ink mb-2">{q.question}</p>
                                <div className="flex items-start gap-2">
                                    {correct ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className="text-xs text-ink-muted leading-snug">
                                        {correct
                                            ? t('correctAnswer', { answer: q.options[q.correct] })
                                            : t('yourAnswerVsCorrect', {
                                                  yourAnswer: userAnswer !== null ? q.options[userAnswer] : t('skipped'),
                                                  correctAnswer: q.options[q.correct],
                                              })}
                                    </p>
                                </div>
                                <p className="text-xs text-ink-faint italic mt-2 leading-snug">{q.explanation}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 py-4 mb-2">
                <Link
                    href="/tools"
                    aria-label={t('backToTools')}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-orange-500" />
                    <h1 className="text-base font-bold text-ink">{t('title')}</h1>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1.5 mb-6">
                {quizQuestions.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'flex-1 h-1.5 rounded-full transition-colors',
                            i < current ? 'bg-primary' : i === current ? 'bg-primary/60' : 'bg-border'
                        )}
                    />
                ))}
            </div>

            {/* Question counter */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wide">
                    {t('questionCounter', { current: current + 1, total: quizQuestions.length })}
                </span>
                {revealed && (
                    <span className={cn('text-xs font-bold', selected === question.correct ? 'text-emerald-600' : 'text-rose-500')}>
                        {selected === question.correct ? t('correct') : t('notQuite')}
                    </span>
                )}
            </div>

            {/* Question card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-5">
                <p className="text-base font-bold text-ink leading-snug mb-5">{question.question}</p>

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
                                onClick={() => handleSelect(idx)}
                                disabled={revealed}
                                className={cn(
                                    'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all flex items-center gap-3',
                                    style,
                                    revealed ? 'cursor-default' : 'cursor-pointer'
                                )}
                            >
                                <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {option}
                                {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
                                {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 ml-auto flex-shrink-0" />}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {revealed && (
                    <div className="mt-4 bg-surface-muted rounded-xl px-4 py-3">
                        <p className="text-xs text-ink-muted leading-relaxed italic">{question.explanation}</p>
                    </div>
                )}
            </div>

            {revealed && (
                <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    {isLast ? t('seeResults') : t('nextQuestion')}
                    <ArrowRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
