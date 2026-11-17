'use client';

import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';

import { QrEventDetailsLine } from '@/components/qrLanding/QrEventDetailsLine';
import { QrJoinCard } from '@/components/qrLanding/QrJoinCard';
import { QrMoreOptionsHint } from '@/components/qrLanding/QrMoreOptionsHint';
import { AppLink } from '@/components/ui/AppLink';
import { useMoreBelowHint } from '@/hooks/useMoreBelowHint';
import {
    type QrEventDetails,
    qrJoinAccountHrefs,
    type QrLandingChoice,
    qrLandingChoiceHref,
    type QrLandingPlan,
    splitQrLandingChoices,
} from '@/lib/qrLanding';

interface QrLandingChoicesProps {
    plan: QrLandingPlan;
    eventId: string | null;
    onChoose: (choice: QrLandingChoice) => void;
    // The event's own cover and name, for the feed preview on the join card.
    coverSrc: string | null;
    eventTitle: string;
    // A signed-in visitor already has an account: no account note, no "without an account" label.
    isSignedIn: boolean;
    // When and where the event is, under its name. Null while loading or when the event has neither.
    details: QrEventDetails | null;
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

export function QrLandingChoices({ plan, eventId, onChoose, coverSrc, eventTitle, isSignedIn, details }: QrLandingChoicesProps) {
    const t = useTranslations('QrCodePage');
    const { event, rest } = splitQrLandingChoices(plan.choices);
    const eventHref = event ? qrLandingChoiceHref(event, plan, eventId) : null;
    const showCard = Boolean(event && eventHref);
    const rows = showCard ? rest : plan.choices;
    const accountHrefs = event === 'join' && !isSignedIn ? qrJoinAccountHrefs(plan, eventId) : null;

    const restRef = useRef<HTMLDivElement>(null);
    const hint = useMoreBelowHint(restRef, showCard && rows.length > 0);

    const label = (choice: QrLandingChoice) => {
        if (choice === 'join') return t('choices.join');
        if (choice === 'open') return t('choices.open');
        if (choice === 'upload') return t('guestCode.uploadButton');
        return t('guestCode.wishButton');
    };

    const line = (choice: QrLandingChoice) => {
        if (choice === 'join' || choice === 'open') return t('choices.eventHint');
        if (choice === 'upload') return t('choices.uploadLine');
        if (choice === 'wish') return t('choices.wishLine');
        return null;
    };

    const handleChoose = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onChoose(event.currentTarget.dataset.choice as QrLandingChoice);
        },
        [onChoose],
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Details: pulled up to sit under the event's name in the page header. */}
            {details ? (
                <div className="-mt-4 -mb-2">
                    <QrEventDetailsLine details={details} />
                </div>
            ) : null}

            {/* Event card */}
            {showCard && event && eventHref ? (
                <QrJoinCard choice={event} href={eventHref} coverSrc={coverSrc} title={eventTitle} accountHrefs={accountHrefs} />
            ) : null}

            {/* Other choices */}
            {rows.length > 0 ? (
                <div ref={restRef} className="flex scroll-mt-6 flex-col gap-1">
                    {showCard && event === 'join' && !isSignedIn ? (
                        <h2 className="px-2 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{t('choices.noAccount')}</h2>
                    ) : null}
                    <div className="flex flex-col divide-y divide-border">
                        {rows.map((choice) => {
                            const text = label(choice);
                            const subline = line(choice);
                            const href = qrLandingChoiceHref(choice, plan, eventId);
                            const body = (
                                <>
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                                        <Image src={ICONS[choice]} alt={text} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="text-[15px] font-semibold text-ink">{text}</span>
                                        {subline && <span className="mt-0.5 text-[13px] text-ink-muted">{subline}</span>}
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
            ) : null}

            {/* More below */}
            {hint.isVisible ? <QrMoreOptionsHint onReveal={hint.reveal} /> : null}
        </div>
    );
}
