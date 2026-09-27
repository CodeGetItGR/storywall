'use client';

import '@/app/globals.css';

import { useReportCrash } from '@/hooks/useReportCrash';
import { getGlobalErrorCopy } from '@/lib/globalErrorCopy';

// Replaces the root layout, so it brings its own <html> and <body>.
export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
    useReportCrash(error);
    const copy = getGlobalErrorCopy(typeof document === 'undefined' ? undefined : document.documentElement.lang);

    return (
        <html lang={copy.locale} className="h-dvh bg-background">
            <body className="antialiased">
                {/* Error */}
                <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-16 text-center">
                    <h1 className="mb-3 max-w-md text-2xl font-bold text-balance text-ink">{copy.title}</h1>
                    <p className="mb-8 max-w-sm text-sm leading-relaxed text-ink-muted">{copy.description}</p>
                    <button
                        type="button"
                        onClick={unstable_retry}
                        className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
                    >
                        {copy.retry}
                    </button>
                </main>
            </body>
        </html>
    );
}
