'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GiftStepIcon } from '@/components/giftMode/GiftStepIcon';
import { GIFT_STEP_COUNT, type GiftStepState, giftStepState } from '@/lib/gift';
import { cn } from '@/lib/utils';

const STEPS = Array.from({ length: GIFT_STEP_COUNT }, (_, index) => index);

const BADGE_CLASS = 'absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white';

// How a gift works, in three steps. Done steps get a tick and the current one stands out.
export function GiftSteps({ stepsDone }: { stepsDone: number | null }) {
    const t = useTranslations('GiftMode.manage');

    return (
        <ol className="flex flex-col">
            {STEPS.map((index) => {
                const state: GiftStepState = giftStepState(index, stepsDone);
                const title = t(`steps.${index}.title`);
                return (
                    <li
                        key={index}
                        aria-current={state === 'current' ? 'step' : undefined}
                        className="relative flex gap-3 pb-5 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:top-14 [&:not(:last-child)]:before:bottom-1 [&:not(:last-child)]:before:left-6 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-[#F3DED5]"
                    >
                        {/* Icon */}
                        <div
                            className={cn(
                                'relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0EB]',
                                state === 'current' && 'ring-2 ring-[#E48279]/45',
                                state === 'upcoming' && 'bg-surface-muted',
                            )}
                        >
                            <GiftStepIcon index={index} label={title} muted={state === 'upcoming'} />
                            {state === 'done' ? (
                                <span className={cn(BADGE_CLASS, 'bg-[linear-gradient(135deg,#C777B1,#E48279_55%,#F2A65C)] text-white')}>
                                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                                </span>
                            ) : (
                                <span
                                    aria-hidden="true"
                                    className={cn(BADGE_CLASS, state === 'upcoming' ? 'bg-surface-muted text-ink-muted' : 'bg-white text-[#E48279] shadow-sm')}
                                >
                                    {index + 1}
                                </span>
                            )}
                        </div>

                        {/* Text */}
                        <div className="min-w-0 pt-1">
                            <p className={cn('text-sm font-semibold', state === 'upcoming' ? 'text-ink-muted' : 'text-ink')}>{title}</p>
                            <p className="mt-0.5 text-sm text-ink-muted">{t(`steps.${index}.body`)}</p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
