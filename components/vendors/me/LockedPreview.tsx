'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

// A partner-only feature: a blurred sample of it under a fade, with what it is and the partner action on top.
// The sample is decoration only, hidden from assistive tech and not focusable. Without canApply (already applied, or
// the prompt was turned off) it says the feature is for partners instead of offering the sheet.
export function LockedPreview({
    label,
    canApply,
    onApplyAction,
    children,
}: {
    label: string;
    canApply: boolean;
    onApplyAction: () => void;
    children: ReactNode;
}) {
    const t = useTranslations('Vendors.partner');

    return (
        <div className="relative overflow-hidden rounded-lg">
            {/* Sample */}
            <div aria-hidden="true" inert className="pointer-events-none blur-[3px] select-none">
                {children}
            </div>

            {/* Fade and action */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-radial from-card/90 via-card/55 to-card/10 px-4 text-center">
                <span className="flex size-9 items-center justify-center rounded-full bg-(image:--logo) shadow-sm">
                    <Lock className="size-4 text-white" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-ink">{label}</p>
                {canApply ? (
                    <Button type="button" size="lg" onClick={onApplyAction}>
                        {t('become')}
                    </Button>
                ) : (
                    <p className="text-sm text-ink-muted">{t('partnersOnly')}</p>
                )}
            </div>
        </div>
    );
}
