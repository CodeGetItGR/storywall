import '@/app/globals.css';

import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { type ReactNode } from 'react';

import { OverlayLeakProbe } from '@/components/dev/OverlayLeakProbe';
import { IncidentBanner } from '@/components/incident/IncidentBanner';
import { rootFontClassName } from '@/components/layout/rootFonts';
import { VercelInsights } from '@/components/layout/VercelInsights';
import { INCIDENT_MODE } from '@/lib/incident';

type RootDocumentProps = {
    children: ReactNode;
    // Left out, the provider inherits the full catalog from i18n/request.ts.
    messages?: AbstractIntlMessages;
    // Public pages scroll the document. The app instead locks the body and
    // scrolls inside its own containers. Set in the server HTML, so a page is
    // scrollable before its JavaScript has loaded.
    documentScroll?: boolean;
};

// The <html> and <body> shared by both root layouts, app/(landing) and app/(main).
export async function RootDocument({ children, messages, documentScroll = false }: RootDocumentProps) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={`${rootFontClassName} h-dvh bg-background`}>
            <body
                className={
                    documentScroll
                        ? 'min-h-dvh overflow-x-hidden overflow-y-auto antialiased'
                        : 'flex h-(--visual-viewport-page-height) flex-col overflow-hidden overscroll-none antialiased'
                }
            >
                {/* Incident */}
                {INCIDENT_MODE && <IncidentBanner />}
                <NextIntlClientProvider messages={messages}>
                    {documentScroll ? children : <div className="relative min-h-0 flex-1">{children}</div>}
                </NextIntlClientProvider>
                {process.env.NODE_ENV === 'production' ? <VercelInsights /> : <OverlayLeakProbe />}
            </body>
        </html>
    );
}
