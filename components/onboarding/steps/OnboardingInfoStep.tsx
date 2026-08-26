import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { OnboardingStepIcon } from '@/components/onboarding/OnboardingStepIcon';

interface OnboardingInfoStepProps {
    icon: LucideIcon;
    title: string;
    body: string;
    linkHref?: string;
    linkLabel?: string;
    onLinkClick?: () => void;
    children?: ReactNode;
}

export function OnboardingInfoStep({ icon, title, body, linkHref, linkLabel, onLinkClick, children }: OnboardingInfoStepProps) {
    return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
            <OnboardingStepIcon icon={icon} />
            <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
            {children}
            {linkHref && linkLabel && (
                <Link href={linkHref} onClick={onLinkClick} className="text-sm font-semibold text-primary hover:underline">
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}
