import '@/app/globals.css';

import { Analytics } from '@vercel/analytics/next';
import { Abhaya_Libre, Alegreya, Geist } from 'next/font/google';
import { type AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { type ReactNode } from 'react';

import { OverlayLeakProbe } from '@/components/dev/OverlayLeakProbe';

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
};

// The <html> and <body> shared by both root layouts, app/(landing) and app/(main).
export async function RootDocument({ children, messages }: RootDocumentProps) {
    const locale = await getLocale();

    return (
        <html lang={locale} className={`${geist.className} ${abhayaLibre.variable} ${alegreya.variable} h-dvh bg-background`}>
            <body className="h-(--visual-viewport-height) overflow-hidden overscroll-none antialiased">
                <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
                {process.env.NODE_ENV === 'production' ? <Analytics /> : <OverlayLeakProbe />}
            </body>
        </html>
    );
}
