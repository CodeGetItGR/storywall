import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { OnboardingStepIcon } from '@/components/onboarding/OnboardingStepIcon';

interface OnboardingVenueStepProps {
    href: string;
    hasVenue: boolean;
    onNavigate: () => void;
    onDone: () => void;
}

export function OnboardingVenueStep({ href, hasVenue, onNavigate, onDone }: OnboardingVenueStepProps) {
    const t = useTranslations('HostOnboarding');

    return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
            <OnboardingStepIcon icon={MapPin} />
            <div>
                <h3 className="text-base font-semibold text-ink">{t(hasVenue ? 'venue.readyTitle' : 'venue.askTitle')}</h3>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{t(hasVenue ? 'venue.readyBody' : 'venue.askBody')}</p>
            </div>
            <Link
                href={href}
                onClick={onNavigate}
                className="rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
                {t(hasVenue ? 'venue.edit' : 'venue.add')}
            </Link>
            <button type="button" onClick={onDone} className="text-sm font-semibold text-ink-muted hover:text-ink">
                {t('continue')}
            </button>
        </div>
    );
}
