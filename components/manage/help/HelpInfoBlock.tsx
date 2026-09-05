import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface HelpInfoBlockProps {
    icon: LucideIcon;
    title: string;
    body: string;
    linkHref?: string;
    linkLabel?: string;
}

export function HelpInfoBlock({ icon: Icon, title, body, linkHref, linkLabel }: HelpInfoBlockProps) {
    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
                <Icon className="h-8 w-8 text-primary-dark" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
            {linkHref && linkLabel && (
                <Link href={linkHref} className="text-sm font-semibold text-primary hover:underline">
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}
