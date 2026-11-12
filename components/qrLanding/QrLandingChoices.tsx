'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { type QrLandingChoice, qrLandingChoiceHref, type QrLandingPlan } from '@/lib/qrLanding';
import { cn } from '@/lib/utils';

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

// The first choice is the main one: Join for a guest, Open the event for a member.
const ROW_CLASS = 'flex w-full items-center gap-4 rounded-2xl border bg-background px-4 py-3.5 text-left transition-colors';

export function QrLandingChoices({ plan, eventId, onChoose }: QrLandingChoicesProps) {
    const t = useTranslations('QrCodePage');

    const label = (choice: QrLandingChoice) => {
        if (choice === 'join') return t('choices.join');
        if (choice === 'open') return t('choices.open');
        if (choice === 'upload') return t('guestCode.uploadButton');
        return t('guestCode.wishButton');
    };

    const handleChoose = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onChoose(event.currentTarget.dataset.choice as QrLandingChoice);
        },
        [onChoose],
    );

    return (
        <div className="flex flex-col gap-3">
            {/* Title */}
            <h2 className="mb-1 text-center text-sm text-ink-muted">{t('choices.title')}</h2>

            {/* Choices */}
            {plan.choices.map((choice, index) => {
                const text = label(choice);
                const href = qrLandingChoiceHref(choice, plan, eventId);
                const className = cn(ROW_CLASS, index === 0 ? 'border-primary/50 hover:border-primary' : 'border-border hover:border-ink-faint/40');
                const body = (
                    <>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                            <Image src={ICONS[choice]} alt={text} width={26} height={26} className="h-[26px] w-[26px] object-contain" unoptimized />
                        </span>
                        <span className="flex-1 text-[15px] font-semibold text-ink">{text}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    </>
                );

                return href ? (
                    <AppLink key={choice} href={href} className={className}>
                        {body}
                    </AppLink>
                ) : (
                    <button key={choice} type="button" data-choice={choice} onClick={handleChoose} className={className}>
                        {body}
                    </button>
                );
            })}
        </div>
    );
}
