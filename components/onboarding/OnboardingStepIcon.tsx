import type { LucideIcon } from 'lucide-react';

// The onboarding wizard's "illustration" for a step is a large icon in a
// soft-tinted circle rather than a screenshot or bespoke artwork — it can't go
// stale when a button moves, and it reuses the same iconography as the rest
// of the app instead of a separate asset pipeline.
export function OnboardingStepIcon({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
            <Icon className="h-8 w-8 text-primary-dark" strokeWidth={1.75} aria-hidden="true" />
        </div>
    );
}
