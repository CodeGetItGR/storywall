'use client';

import { useTranslations } from 'next-intl';

import type { WithdrawalGuidanceSection } from '@/lib/adminWithdrawals';

// The recommendation is generated in English for staff and is shown as written;
// only the known section headings are localized.
export function WithdrawalGuidanceBlock({ section }: { section: WithdrawalGuidanceSection }) {
    const t = useTranslations('AdminPage');
    const heading = section.key ? t(`withdrawals.guidance.${section.key}`) : section.heading;

    return (
        <section className="min-w-0">
            {/* Heading */}
            {heading && <h4 className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{heading}</h4>}

            {/* Body */}
            <div className="mt-1 max-w-3xl space-y-1.5 text-sm leading-6 text-ink">
                {section.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </div>
        </section>
    );
}
