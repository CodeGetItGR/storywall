'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { type QrLandingChoice, qrLandingChoiceHref, type QrLandingPlan } from '@/lib/qrLanding';

interface QrLandingChoicesProps {
    plan: QrLandingPlan;
    eventId: string | null;
    onChoose: (choice: QrLandingChoice) => void;
}

const ICONS: Record<QrLandingChoice, string> = {
    join: '/icons/balloon.svg',
    open: '/icons/home.svg',
    upload: '/icons/camera.svg',
    wish: '/icons/wishbook.svg',
    wishbook: '/icons/wishbook.svg',
};

// Plain rows split by thin lines, so the choices read as one short list.
const ROW_CLASS = 'flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-surface-muted/60';

export function QrLandingChoices({ plan, eventId, onChoose }: QrLandingChoicesProps) {
    const t = useTranslations('QrCodePage');

    const label = (choice: QrLandingChoice) => {
        if (choice === 'join') return t('choices.join');
        if (choice === 'open') return t('choices.open');
        if (choice === 'upload') return t('guestCode.uploadButton');
        return t('guestCode.wishButton');
    };

    // Only the event rows get a line under the label.
    const hint = (choice: QrLandingChoice) => (choice === 'join' || choice === 'open' ? t('choices.eventHint') : null);

    const handleChoose = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onChoose(event.currentTarget.dataset.choice as QrLandingChoice);
        },
        [onChoose],
    );

    return (
        <div className="flex flex-col gap-1">
            {/* Title */}
            <h2 className="mb-1 text-center text-sm text-ink-muted">{t('choices.title')}</h2>

            {/* Choices */}
            <div className="flex flex-col divide-y divide-border">
                {plan.choices.map((choice) => {
                    const text = label(choice);
                    const line = hint(choice);
                    const href = qrLandingChoiceHref(choice, plan, eventId);
                    const body = (
                        <>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                                <Image src={ICONS[choice]} alt={text} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-[15px] font-semibold text-ink">{text}</span>
                                {line && <span className="mt-0.5 text-[13px] text-ink-muted">{line}</span>}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                        </>
                    );

                    return href ? (
                        <AppLink key={choice} href={href} className={ROW_CLASS}>
                            {body}
                        </AppLink>
                    ) : (
                        <button key={choice} type="button" data-choice={choice} onClick={handleChoose} className={ROW_CLASS}>
                            {body}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
