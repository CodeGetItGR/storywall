import '@/app/globals.css';

import { Abhaya_Libre, Alegreya, Geist } from 'next/font/google';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { type ReactNode } from 'react';

import { OverlayLeakProbe } from '@/components/dev/OverlayLeakProbe';
import { VercelInsights } from '@/components/layout/VercelInsights';

const geist = Geist({ subsets: ['latin'] });

const abhayaLibre = Abhaya_Libre({
    variable: '--font-abhaya-libre',
    subsets: ['latin'],
    weight: ['400'],
});

const alegreya = Alegreya({
    variable: '--font-alegreya',
    subsets: ['latin'],
    weight: ['400'],
});

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
        <html lang={locale} className={`${geist.className} ${abhayaLibre.variable} ${alegreya.variable} h-dvh bg-background`}>
            <body
                className={
                    documentScroll
                        ? 'min-h-dvh overflow-x-hidden overflow-y-auto antialiased'
                        : 'h-(--visual-viewport-page-height) overflow-hidden overscroll-none antialiased'
                }
            >
                <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
                {process.env.NODE_ENV === 'production' ? <VercelInsights /> : <OverlayLeakProbe />}
            </body>
        </html>
    );
}
