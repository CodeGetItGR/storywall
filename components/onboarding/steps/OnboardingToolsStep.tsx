'use client';

import { BookHeart, Calendar, Gift, Images, Music, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OnboardingLinksStep } from '@/components/onboarding/steps/OnboardingLinksStep';
import type { EventModuleResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

const TOOL_CATALOG = [
    { moduleKey: null, icon: Calendar, iconClassName: 'text-amber-500', href: routes.tools.schedule, labelKey: 'schedule' },
    { moduleKey: 'rsvp', icon: Users, iconClassName: 'text-emerald-500', href: routes.tools.rsvp, labelKey: 'rsvp' },
    { moduleKey: 'gallery', icon: Images, iconClassName: 'text-cyan-600', href: routes.tools.gallery, labelKey: 'gallery' },
    { moduleKey: 'playlist', icon: Music, iconClassName: 'text-violet-500', href: routes.tools.playlist, labelKey: 'playlist' },
    { moduleKey: 'wishbook', icon: BookHeart, iconClassName: 'text-rose-500', href: routes.tools.wishbook, labelKey: 'wishbook' },
    { moduleKey: 'wishlist', icon: Gift, iconClassName: 'text-rose-500', href: routes.tools.gifts, labelKey: 'gifts' },
] as const;

interface OnboardingToolsStepProps {
    eventModules: EventModuleResponseDto[];
    onNavigate: () => void;
}

export function OnboardingToolsStep({ eventModules, onNavigate }: OnboardingToolsStepProps) {
    const t = useTranslations('HostOnboarding');
    const enabledModuleKeys = new Set(eventModules.filter((module_) => module_.isEnabled && module_.isAvailable).map((module_) => module_.moduleKey));

    const items = TOOL_CATALOG.filter((entry) => entry.moduleKey === null || enabledModuleKeys.has(entry.moduleKey)).map((entry) => ({
        key: entry.labelKey,
        icon: entry.icon,
        iconClassName: entry.iconClassName,
        href: entry.href,
        label: t(`tools.items.${entry.labelKey}`),
    }));

    return <OnboardingLinksStep title={t('tools.title')} body={t('tools.body')} items={items} onNavigate={onNavigate} />;
}
