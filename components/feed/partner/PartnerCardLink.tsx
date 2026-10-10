import type { ReactNode } from 'react';

// The card's tap target. Without an href (the admin preview) it renders the same box with no link.
export function PartnerCardLink({
    href,
    newTabLabel,
    className,
    children,
}: {
    href: string | null;
    newTabLabel: string;
    className?: string;
    children: ReactNode;
}) {
    if (!href) return <div className={className}>{children}</div>;

    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {children}
            <span className="sr-only">{newTabLabel}</span>
        </a>
    );
}
