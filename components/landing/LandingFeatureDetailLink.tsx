import { cn } from '@/lib/utils';

// A feature card's link to its own page, in the section's gold (important over .landing-page a).
export function LandingFeatureDetailLink({ className, href, label }: { className?: string; href: string; label: string }) {
    return (
        <a
            className={cn(
                'inline-flex w-max items-center gap-2 text-[14px] font-black text-[#f2c66a]! underline-offset-4 focus-ring hover:underline focus-visible:outline-offset-4',
                className,
            )}
            href={href}
        >
            <span>{label}</span>
            <span aria-hidden="true">→</span>
        </a>
    );
}
