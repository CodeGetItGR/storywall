import { ImagePlus } from 'lucide-react';
import Link from 'next/link';

type BannerFallbackProps = {
    actionHref?: string;
    actionLabel?: string;
};

export function BannerFallback({ actionHref, actionLabel }: BannerFallbackProps) {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(180deg,#fffaf7_0%,#f8efe9_42%,#c8bbb3_72%,#6f6864_100%)]">
            <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.72),rgba(255,255,255,0)_28%),radial-gradient(circle_at_78%_18%,rgba(255,167,116,0.22),rgba(255,167,116,0)_34%)]"
                aria-hidden="true"
            />
            <div
                className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(80,72,68,0.22)_46%,rgba(46,41,39,0.56)_100%)]"
                aria-hidden="true"
            />
            {actionHref && actionLabel && (
                <Link
                    href={actionHref}
                    className="absolute left-4 top-4 z-10 inline-flex min-h-9 items-center gap-2 rounded-full bg-background/80 px-3 text-xs font-semibold text-ink-muted shadow-[0_10px_24px_rgba(36,31,26,0.12)] backdrop-blur-md transition-colors hover:bg-background hover:text-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
