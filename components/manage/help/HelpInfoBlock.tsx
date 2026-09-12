import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface HelpInfoBlockProps {
    title: string;
    body: string;
    linkHref?: string;
    linkLabel?: string;
}

export function HelpInfoBlock({ title, body, linkHref, linkLabel }: HelpInfoBlockProps) {
    return (
        <>
            {/* Help action */}
            <section className="border-t border-border/70 pt-7 first:border-t-0 first:pt-0">
                <div className="mx-auto text-center sm:max-w-xl">
                    {/* Title */}
                    <div className="relative">
                        <h3 className="px-8 text-center text-base font-semibold text-ink">{title}</h3>
                    </div>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">{body}</p>
                    {linkHref && linkLabel && (
                        <Link
                            href={linkHref}
                            className="group mt-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                            {linkLabel}
                            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            </section>
        </>
    );
}
