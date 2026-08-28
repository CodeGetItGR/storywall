'use client';

import { BookHeart, Calendar, Gift, Images, Music, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OnboardingLinksStep } from '@/components/onboarding/steps/OnboardingLinksStep';
import type { EventModuleResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

interface OnboardingToolsStepProps {
    eventId: string;
    eventModules: EventModuleResponseDto[];
    onNavigate: () => void;
}

export function OnboardingToolsStep({ eventId, eventModules, onNavigate }: OnboardingToolsStepProps) {
    const t = useTranslations('HostOnboarding');
    const enabledModuleKeys = new Set(eventModules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey));

    const toolCatalog = [
        { moduleKey: null, icon: Calendar, iconClassName: 'text-amber-500', href: routes.events.tools.schedule(eventId), labelKey: 'schedule' },
        { moduleKey: 'rsvp', icon: Users, iconClassName: 'text-emerald-500', href: routes.events.tools.rsvp(eventId), labelKey: 'rsvp' },
        { moduleKey: 'gallery', icon: Images, iconClassName: 'text-cyan-600', href: routes.events.tools.gallery(eventId), labelKey: 'gallery' },
        { moduleKey: 'playlist', icon: Music, iconClassName: 'text-violet-500', href: routes.events.tools.playlist(eventId), labelKey: 'playlist' },
        { moduleKey: 'wishbook', icon: BookHeart, iconClassName: 'text-rose-500', href: routes.events.tools.wishbook(eventId), labelKey: 'wishbook' },
        { moduleKey: 'wishlist', icon: Gift, iconClassName: 'text-rose-500', href: routes.events.tools.gifts(eventId), labelKey: 'gifts' },
    ] as const;

    const items = toolCatalog.filter((entry) => entry.moduleKey === null || enabledModuleKeys.has(entry.moduleKey)).map((entry) => ({
        key: entry.labelKey,
        icon: entry.icon,
        iconClassName: entry.iconClassName,
        href: entry.href,
        label: t(`tools.items.${entry.labelKey}`),
    }));

    return <OnboardingLinksStep title={t('tools.title')} body={t('tools.body')} items={items} onNavigate={onNavigate} />;
}
