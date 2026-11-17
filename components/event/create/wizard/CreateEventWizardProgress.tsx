'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { wizardProgress } from '@/lib/createEventWizardProgress';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

const TONES = {
    default: { track: 'bg-[#f3e7dc]', fill: 'bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)]', counter: 'text-ink' },
    onPhoto: { track: 'bg-white/40', fill: 'bg-white', counter: 'text-white' },
} as const;

// The wizard's top row: the shell's own button (close or back), a brand-gradient bar and "n/N".
// The bar is decoration; screen readers get "Step n of N".
export function CreateEventWizardProgress({ leading, tone = 'default' }: { leading: ReactNode; tone?: keyof typeof TONES }) {
    const t = useTranslations('CreateEventPage.wizard');
    const { step, steps } = useCreateEventForm();
    const { current, total, percent } = wizardProgress(step, steps);

    return (
        <div className="flex items-center gap-3">
            {leading}
            {/* Bar */}
            <div aria-hidden="true" className={`h-1.5 flex-1 overflow-hidden rounded-full ${TONES[tone].track}`}>
                <div
                    className={`h-full rounded-full ${TONES[tone].fill} transition-[width] duration-300 motion-reduce:transition-none`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            {/* Counter */}
            <span className={`min-w-8 text-right text-[13px] font-bold ${TONES[tone].counter}`}>
                <span aria-hidden="true">
                    {current}/{total}
                </span>
                <span className="sr-only">{t('stepCounter', { current, total })}</span>
            </span>
        </div>
    );
}
